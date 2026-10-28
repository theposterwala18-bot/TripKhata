/* TripKhata v0.6.0 Firebase readiness layer
   Safe-by-default: does nothing until a real Firebase config is provided and SDK is loaded.
   Planned: Email/Password auth, Google sign-in, Firestore sync, Storage receipts.
*/
(function(){
  window.TRIPKHATA_CLOUD = window.TRIPKHATA_CLOUD || {
    enabled:false,
    provider:"firebase",
    status:"not-configured",
    lastSync:null
  };

  function configured(){
    const c=window.TRIPKHATA_FIREBASE_CONFIG;
    return !!(c && c.apiKey && c.projectId && !String(c.apiKey).startsWith("PASTE_"));
  }

  window.tripKhataCloudStatus=function(){
    if(!configured()){
      window.TRIPKHATA_CLOUD.status="not-configured";
      return {enabled:false,status:"not-configured"};
    }
    const live=window.TRIPKHATA_CLOUD?.status;
    return {enabled:!!window.TRIPKHATA_CLOUD?.enabled,status:live||"config-present"};
  };

  // Compatibility bridge. Real Firebase auth/sync is initialized by auth-v100.js + sync-v060.js.
  window.tripKhataCloudInit=async function(){
    if(!configured()) throw new Error("Firebase config missing");
    return window.TRIPKHATA_CLOUD;
  };
})();