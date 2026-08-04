# Sentralogis Copilot MVP - UI Wireframes

## 1. Main Chat Interface
```text
+-----------------------------------------------------------+
| [Header] Sentralogis Copilot                    [Profile] |
+-----------------------------------------------------------+
|                                                           |
|  [User] Assign JO-221 to Budi                             |
|                                                           |
|  [Copilot] I found Job Order JO-221 and Driver "Budi".    |
|                                                           |
|  +----------------------------------------------------+   |
|  | Action Suggestion: Assign Job Order                |   |
|  | Job: JO-221 (Jakarta -> Bandung)                   |   |
|  | Driver: Budi (Truck: B 1234 CD)                    |   |
|  |                                                    |   |
|  |          [ Confirm Assignment ]  [ Cancel ]        |   |
|  +----------------------------------------------------+   |
|                                                           |
|  [User] (Clicks Confirm)                                  |
|                                                           |
|  [Copilot] ✅ Successfully assigned JO-221 to Budi.      |
|            The driver has been notified via WhatsApp.     |
|                                                           |
+-----------------------------------------------------------+
| (📎 Upload) | Type your command here...         | [Send] |
+-----------------------------------------------------------+
```

## 2. OCR Extraction Interface
```text
+-----------------------------------------------------------+
|                                                           |
|  [User] Uploaded: container_seal_photo.jpg                |
|  [Image Thumbnail]                                        |
|                                                           |
|  [Copilot] I scanned the photo. Here is what I found:     |
|                                                           |
|  +----------------------------------------------------+   |
|  | Detected Data                                      |   |
|  | Container Number: MSKU1234567                      |   |
|  | Seal Number: S12345                                |   |
|  |                                                    |   |
|  | Suggested Action: Update Active Job Order          |   |
|  | Target: JO-505 (Currently at Depot loading)        |   |
|  |                                                    |   |
|  |          [ Confirm Update ]  [ Edit Data ]         |   |
|  +----------------------------------------------------+   |
|                                                           |
+-----------------------------------------------------------+
```

## 3. WhatsApp Paste Interface
```text
+-----------------------------------------------------------+
|                                                           |
|  [User] Tolong ambil 2 container besok pagi di depo       |
|         mutiara kirim ke gudang cikarang pake wingbox     |
|                                                           |
|  [Copilot] I extracted the details for a new Work Order:  |
|                                                           |
|  +----------------------------------------------------+   |
|  | Draft Work Order                                   |   |
|  | Customer: Unknown (Please select)                  |   |
|  | Pickup: Depo Mutiara                               |   |
|  | Destination: Gudang Cikarang                       |   |
|  | Date: Tomorrow, Morning                            |   |
|  | Requirement: 2x Container, Wingbox                 |   |
|  |                                                    |   |
|  |          [ Proceed to Full Form ]                  |   |
|  +----------------------------------------------------+   |
|                                                           |
+-----------------------------------------------------------+
```
