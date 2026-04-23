import React, { useState, useRef } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StyleSheet, Text, TouchableOpacity, View, Vibration, Alert, ActivityIndicator, Button ,Image} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { authFetch } from '../constants/api';

const recieptIcon = require('../assets/images/receiptIcon.png');
//const barcodeIcon = require('../assets/images/barcodeIcon.png');

export default function CameraScanner() {
    const [permission, requestPermission] = useCameraPermissions();
    const [cameraMode, setCameraMode] = useState<'CHOICE' | 'BARCODE' | 'PHOTO'>('CHOICE');
    const [loading, setLoading] = useState(false);
    const isFocused = useIsFocused();
    const router = useRouter();
    const cameraRef = useRef<CameraView>(null);   /// variables and hooks for states and permissios and refs
    const isLocked = useRef(false);
    
    // Check if camera permission is granted
    if (!permission?.granted) {
        return (
            <View style={styles.center}>
                <Text style={styles.permissionText}>Camera permission required</Text>
                <Button title="Allow Camera" onPress={requestPermission} />
            </View>
        );
    }

  
    const handleScan = async ({ data }: { data: string }) => { // this function is called when a barcode is scanned and it sends the barcode data to the backend
    if (isLocked.current) return;
    isLocked.current = true;
    Vibration.vibrate(100);

    try {
        const response = await authFetch('/scan/barcode', {
            method: 'POST',
            body: JSON.stringify({ barcode: data }),
        });

        if (!response) {
            isLocked.current = false;
            return;
        }

        const result = await response.json();
        console.log("Barcode result:", result);

        const newItem = [{
            name: result.item_name || "Unknown Product",  // create a new item object with data received from the backend
            brand: result.brand || "Unknown Brand",
            price: "0.00",
            category: result.category || "Other",
            image_url: result.image_url || "",
            source: "barcode"
        }];

        router.push({
            pathname: '/ReviewScreen',  // redirect to the review screen for processesing and confirmting of new items 
            params: { scannedItems: JSON.stringify(newItem) },
        });

        // Only unlocks after a delay so the camera doesn't re-scan immediately i.e preventing spamming
        setTimeout(() => { isLocked.current = false; }, 2000);

    } catch (error) {
        console.log("Barcode error:", error);
        Alert.alert("Error", "Could not scan barcode.");
        // Keep locked for 3 seconds after error to prevent spam
        setTimeout(() => { isLocked.current = false; }, 3000);
    }
};

   
    const captureReceipt = async () => {
        if (!cameraRef.current) return;

        try {
            setLoading(true);

            const photo = await cameraRef.current.takePictureAsync({ // take a picture and covert it to base64 to send to the backend for ocr processing
                base64: true,
                quality: 0.5,
            });

            let base64Image = photo.base64 || '';  // sometimes the base64 string comes with a prefix like "data:image/jpeg;base64," so i removed that if it's there as sometimes ti was causuing issues   
            if (base64Image.includes(',')) {
                base64Image = base64Image.split(',')[1];
            }

            console.log("Photo captured, sending to backend...");
            console.log("Image size (chars):", base64Image.length);

            const response = await authFetch(`/scan/ocr`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64Image }),
            });

            if (!response) {
                Alert.alert("Error", "Couldn't connect to server.");
                return;
            }

            console.log("Backend response status:", response.status);

            const ocrResult = await response.json();
            console.log("OCR result:", JSON.stringify(ocrResult));

            if (ocrResult.queue && ocrResult.queue.length > 0) {
                router.push({
                    pathname: '/ReviewScreen',
                    params: { scannedItems: JSON.stringify(ocrResult.queue) }, // the backend returns an array of items that it found on the receipt and i pass that to the review screen for the user to confirm and edit before adding to their inventory
                });
                setCameraMode('CHOICE');
            } else {
                Alert.alert("Try Again", "No items found. Ensure the receipt is well lit.");
            }

        } catch (error) {
            console.log("Receipt error:", error);
            Alert.alert("Error", "Couldn't process receipt.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {isFocused && (
          <>
            <TouchableOpacity 
                style={styles.closeBtn} 
                onPress={() => router.replace('/')}
            >
                <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>

            <CameraView
                ref={cameraRef}
                facing="back"
                style={styles.camera}
                onBarcodeScanned={cameraMode === 'BARCODE' ? handleScan : undefined}
                barcodeScannerSettings={{
                    barcodeTypes: ["ean13", "ean8", "qr", "code128", "upc_a"]
                }}
            >
               
                {loading && (
                    <View style={styles.loaderOverlay}>
                        <ActivityIndicator size="large" color="#00FF00" />
                        <Text style={styles.loaderText}>Processing receipt...</Text>
                    </View>
                )}

             
                {cameraMode === 'CHOICE' && !loading && (
                    <View style={styles.choiceOverlay}>
                        <Text style={styles.choiceTitle}>What would you like to scan?</Text>
                        <View style={styles.choiceButtons}>
                            <TouchableOpacity 
                                style={styles.choiceBtn}
                                onPress={() => setCameraMode('PHOTO')}
                            >   
                                <Text style={styles.choiceBtnText}>Scan Receipt</Text>
                                <Text style={styles.choiceSubText}>Add multiple items at once</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.choiceBtn}
                                onPress={() => setCameraMode('BARCODE')}
                            >
                               
                                <Text style={styles.choiceBtnText}>Scan Barcode</Text>
                                <Text style={styles.choiceSubText}>Add a single product</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

          
                {cameraMode === 'BARCODE' && !loading && (
                    <View style={styles.overlay}>
                        <View style={styles.box} />
                        <Text style={styles.hint}>Point at product barcode</Text>
                        <TouchableOpacity 
                            style={styles.backBtn}
                            onPress={() => {
                                isLocked.current = false;
                                setCameraMode('CHOICE');
                            }}
                        >
                            <Text style={styles.backBtnText}>← Back</Text>
                        </TouchableOpacity>
                    </View>
                )}

               
                {cameraMode === 'PHOTO' && !loading && (
                    <View style={styles.photoOverlay}>
                        <Text style={styles.photoHint}>
                            Position receipt in good lighting
                        </Text>
                        <TouchableOpacity 
                            onPress={captureReceipt} 
                            style={styles.captureBtn}
                        >
                            <View style={styles.innerBtn} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.backBtn}
                            onPress={() => setCameraMode('CHOICE')}
                        >
                            <Text style={styles.backBtnText}>← Back</Text>
                        </TouchableOpacity>
                    </View>
                )}

            </CameraView>
            </>
        )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    camera: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
    permissionText: { color: 'white', marginBottom: 20, fontSize: 16 },

    closeBtn: {
        position: 'absolute', top: 50, right: 25, zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.6)', padding: 12, borderRadius: 25
    },
    closeText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

    loaderOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center', alignItems: 'center', zIndex: 20
    },
    loaderText: { color: 'white', marginTop: 12, fontSize: 16 },

    choiceOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 60,
    },
    choiceTitle: {
        color: 'white', fontSize: 18, fontWeight: '600',
        marginBottom: 24, textAlign: 'center'
    },
    choiceButtons: { flexDirection: 'row', gap: 16, paddingHorizontal: 24 },
    choiceBtn: {
        flex: 1, backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 16, padding: 20, alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)'
    },
    choiceIcon: { fontSize: 32, marginBottom: 8 },
    choiceBtnText: { color: 'white', fontSize: 15, fontWeight: '700', textAlign: 'center' },
    choiceSubText: { color: 'rgba(255,255,255,0.6)', fontSize: 11, textAlign: 'center', marginTop: 4 },

    overlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center', alignItems: 'center'
    },
    box: {
        width: 260, height: 110, borderWidth: 3,
        borderColor: '#00FF00', borderRadius: 15
    },
    hint: { color: 'white', marginTop: 15, fontSize: 16, fontWeight: '500' },

    photoOverlay: {
        position: 'absolute', bottom: 50, left: 0, right: 0, alignItems: 'center',
    },
    photoHint: {
        color: 'white', fontSize: 16, fontWeight: '600', marginBottom: 20,
        textShadowColor: 'rgba(0,0,0,0.75)',
        textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 10
    },
    captureBtn: {
        width: 70, height: 70, borderRadius: 35,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 4, borderColor: 'white'
    },
    innerBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'white' },

    backBtn: {
        marginTop: 20, padding: 10,
        backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10
    },
    backBtnText: { color: 'white', fontSize: 14 },
});
