# TripKhata Shared Trip Firestore Setup

TripKhata v0.9.0 uses:
- sharedTripInvites/{inviteCode}
- sharedTrips/{tripId}
- sharedTrips/{tripId}/members/{uid}
- sharedTrips/{tripId}/state/main
- sharedTrips/{tripId}/audit/{auditId}

Deploy `firestore.rules` to Firebase project `tripkhata-a5b27` before testing Shared Trip across different accounts.

The rules keep:
- user account data private to that UID
- invite lookup code-only (no listing)
- trip state readable only after membership exists
- Owner/Admin/Member writable
- Viewer read-only
- member role/remove/ownership controls restricted to Owner
