package com.theposterwala.tripkhata;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Intent;
import android.database.Cursor;
import android.content.MutableContextWrapper;
import android.net.Uri;
import android.provider.ContactsContract;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialException;

import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

import org.json.JSONObject;

public class MainActivity extends Activity {
    private static final String APP_URL = "https://theposterwala18-bot.github.io/TripKhata/";
    private static final String APP_HOST = "theposterwala18-bot.github.io";
    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private static final int FILE_CHOOSER_REQUEST = 1001;
    private static final int CONTACT_PICK_REQUEST = 1002;
    private static final int DEVICE_CREDENTIAL_REQUEST = 1003;
    private String pendingCredentialRequestId = null;
    private CredentialManager credentialManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        credentialManager = CredentialManager.create(this);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setUserAgentString(s.getUserAgentString() + " TripKhataAndroid/1.0.17");

        webView.addJavascriptInterface(new AndroidBridge(), "TripKhataAndroid");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                try {
                    Uri uri = Uri.parse(url);
                    String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
                    String host = uri.getHost();

                    if ("tel".equals(scheme) || "sms".equals(scheme) || "mailto".equals(scheme)) {
                        startActivity(new Intent(Intent.ACTION_VIEW, uri));
                        return true;
                    }

                    if ("https".equals(scheme) && APP_HOST.equalsIgnoreCase(host)) {
                        return false;
                    }

                    if ("https".equals(scheme) || "http".equals(scheme)) {
                        startActivity(new Intent(Intent.ACTION_VIEW, uri));
                        return true;
                    }
                } catch (Exception ignored) {}
                return false;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> callback,
                                             FileChooserParams fileChooserParams) {
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = callback;
                Intent intent = fileChooserParams.createIntent();
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                    return true;
                } catch (Exception e) {
                    filePathCallback = null;
                    return false;
                }
            }
        });

        webView.loadUrl(APP_URL);
    }

    public class AndroidBridge {
        @JavascriptInterface
        public void signInWithGoogle() {
            runOnUiThread(MainActivity.this::startGoogleSignIn);
        }

        @JavascriptInterface
        public void pickContact() {
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_PICK, ContactsContract.CommonDataKinds.Phone.CONTENT_URI);
                    startActivityForResult(intent, CONTACT_PICK_REQUEST);
                } catch (Exception e) {
                    sendContact("", "", e.getLocalizedMessage());
                }
            });
        }

        @JavascriptInterface
        public void confirmTripDelete(String requestId, String tripName) {
            runOnUiThread(() -> {
                try {
                    KeyguardManager km = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
                    if (km == null || !km.isDeviceSecure()) {
                        sendCredentialResult(requestId, false, "Phone screen lock is not set. Set a PIN, pattern or password first.");
                        return;
                    }
                    Intent intent = km.createConfirmDeviceCredentialIntent(
                            "Delete Trip",
                            "Confirm phone PIN/pattern/password to delete " + (tripName == null ? "this trip" : tripName)
                    );
                    if (intent == null) {
                        sendCredentialResult(requestId, false, "Device credential confirmation is unavailable.");
                        return;
                    }
                    pendingCredentialRequestId = requestId;
                    startActivityForResult(intent, DEVICE_CREDENTIAL_REQUEST);
                } catch (Exception e) {
                    sendCredentialResult(requestId, false, e.getLocalizedMessage());
                }
            });
        }
    }

    private void startGoogleSignIn() {
        try {
            GetSignInWithGoogleOption googleOption =
                    new GetSignInWithGoogleOption.Builder(getString(R.string.default_web_client_id))
                            .build();

            GetCredentialRequest request = new GetCredentialRequest.Builder()
                    .addCredentialOption(googleOption)
                    .build();

            credentialManager.getCredentialAsync(
                    new MutableContextWrapper(this),
                    request,
                    new CancellationSignal(),
                    getMainExecutor(),
                    new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                        @Override
                        public void onResult(GetCredentialResponse result) {
                            handleGoogleCredential(result.getCredential());
                        }

                        @Override
                        public void onError(GetCredentialException e) {
                            sendGoogleError(e.getLocalizedMessage());
                        }
                    }
            );
        } catch (Exception e) {
            sendGoogleError(e.getLocalizedMessage());
        }
    }

    private void handleGoogleCredential(Credential credential) {
        try {
            if (credential instanceof CustomCredential) {
                CustomCredential customCredential = (CustomCredential) credential;
                if (GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
                        .equals(customCredential.getType())) {
                    GoogleIdTokenCredential googleCredential =
                            GoogleIdTokenCredential.createFrom(customCredential.getData());
                    sendGoogleToken(googleCredential.getIdToken());
                    return;
                }
            }
            sendGoogleError("Google account credential was not returned.");
        } catch (Exception e) {
            sendGoogleError(e.getLocalizedMessage());
        }
    }

    private void sendGoogleToken(String idToken) {
        if (webView == null || idToken == null) return;
        runOnUiThread(() -> webView.evaluateJavascript(
                "window.tripKhataNativeGoogleToken && window.tripKhataNativeGoogleToken(" +
                        JSONObject.quote(idToken) + ");",
                null
        ));
    }


    private void sendContact(String name, String phone, String error) {
        if (webView == null) return;
        String safeName = name == null ? "" : name;
        String safePhone = phone == null ? "" : phone;
        String safeError = error == null ? "" : error;
        runOnUiThread(() -> webView.evaluateJavascript(
                "window.tripKhataNativeContact && window.tripKhataNativeContact(" +
                        JSONObject.quote(safeName) + "," + JSONObject.quote(safePhone) + "," + JSONObject.quote(safeError) + ");",
                null
        ));
    }

    private void sendCredentialResult(String requestId, boolean ok, String message) {
        if (webView == null || requestId == null) return;
        String safeMessage = message == null ? "" : message;
        runOnUiThread(() -> webView.evaluateJavascript(
                "window.tripKhataNativeCredentialResult && window.tripKhataNativeCredentialResult(" +
                        JSONObject.quote(requestId) + "," + (ok ? "true" : "false") + "," + JSONObject.quote(safeMessage) + ");",
                null
        ));
    }

    private void sendGoogleError(String message) {
        if (webView == null) return;
        String safe = (message == null || message.trim().isEmpty())
                ? "Google login cancelled or failed."
                : message;
        runOnUiThread(() -> webView.evaluateJavascript(
                "window.tripKhataNativeGoogleError && window.tripKhataNativeGoogleError(" +
                        JSONObject.quote(safe) + ");",
                null
        ));
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST && filePathCallback != null) {
            Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
            return;
        }

        if (requestCode == CONTACT_PICK_REQUEST) {
            if (resultCode != RESULT_OK || data == null || data.getData() == null) {
                sendContact("", "", "");
                return;
            }
            Uri uri = data.getData();
            Cursor cursor = null;
            try {
                cursor = getContentResolver().query(
                        uri,
                        new String[]{
                                ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                                ContactsContract.CommonDataKinds.Phone.NUMBER
                        },
                        null, null, null
                );
                if (cursor != null && cursor.moveToFirst()) {
                    String name = cursor.getString(0);
                    String phone = cursor.getString(1);
                    sendContact(name, phone, "");
                } else {
                    sendContact("", "", "Unable to read selected contact.");
                }
            } catch (Exception e) {
                sendContact("", "", e.getLocalizedMessage());
            } finally {
                if (cursor != null) cursor.close();
            }
            return;
        }

        if (requestCode == DEVICE_CREDENTIAL_REQUEST) {
            String requestId = pendingCredentialRequestId;
            pendingCredentialRequestId = null;
            sendCredentialResult(requestId, resultCode == RESULT_OK,
                    resultCode == RESULT_OK ? "" : "Delete cancelled.");
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
