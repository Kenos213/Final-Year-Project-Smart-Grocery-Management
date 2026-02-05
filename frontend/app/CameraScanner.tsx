import React, { useState, useRef } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StyleSheet, Text, TouchableOpacity, View, Vibration, Alert, ActivityIndicator , Button} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { core_URL } from './HostIp';

export default function CameraScanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraMode, setCameraMode] = useState('SCANNER'); 
  const [loading, setLoading] = useState(false); 
  
 
  const navigation = useNavigation<any>();
  
  const cameraRef = useRef<CameraView>(null); 
  const isLocked = useRef(false); 
  const [active, setActive] = useState(true);



  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Text>Camera permission required</Text>
        <Button title="Allow Camera" onPress={requestPermission} />
      </View>
    );
  }


  const handleScan = async ({ data }: { data: string }) => {
    if (isLocked.current || !active) return;
    isLocked.current = true;

    try {
        const response = await fetch(`${core_URL}/scan/barcode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ barcode: data }),
        });

        const result = await response.json();

       
        if (result.type === 'receipt_trigger') {
            Vibration.vibrate(200); 
            setActive(false);        
            setCameraMode('PHOTO');  
            Alert.alert("Looking for receipt", "Take a picture of the receipt");
        } 
        
        
        else {
            Vibration.vibrate(100);
            
            const newItem = [{
                name: result.item_name || "Unknown Product",
                brand: result.brand || "Unknown Brand",
                price: "0.00",
                source: "barcode"
            }];

            setActive(false);
            navigation.navigate('ReviewScreen', { scannedItems: newItem });
            
           
            setTimeout(() => { 
                isLocked.current = false; 
                setActive(true);
            }, 1000);
        }

    } catch (error) {
        console.log("Error:", error);
        setTimeout(() => { isLocked.current = false; }, 2000);
    }
  };


  const captureReceipt = async () => {
    if (cameraRef.current) {
        try {
            setLoading(true); 
            
            const photo = await cameraRef.current.takePictureAsync({
                base64: true,
                quality: 0.5, 
            });

            const response = await fetch(`${core_URL}/scan/ocr`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: photo.base64 }),
            });

            const ocrResult = await response.json();
            
            if (ocrResult.queue && ocrResult.queue.length > 0) {
             
                navigation.navigate('ReviewScreen', { scannedItems: ocrResult.queue });
               
                setCameraMode('SCANNER');
                setActive(true);
            } else {
                Alert.alert("Try Again", "No items found.");
                setActive(true);
            }

        } catch (error) {
            Alert.alert("Error", "Couldnt process receipt.");
        } finally {
            setLoading(false); 
        }
    }
  };

  return (
    <View style={styles.container}>
        
      
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.closeText}>X</Text>
        </TouchableOpacity>

        <CameraView 
            ref={cameraRef} 
            facing="back"
            style={styles.camera} 
            onBarcodeScanned={cameraMode === 'SCANNER' ? handleScan : undefined}
        >
            
            
            {loading && (
                <View style={styles.loaderOverlay}>
                    <ActivityIndicator size="large" color="#00FF00" />
                    <Text style={{color: 'white', marginTop: 10}}>Processing...</Text>
                </View>
            )}

           
            {cameraMode === 'SCANNER' && !loading && (
                <View style={styles.overlay}>
                    <View style={styles.box} />
                    <Text style={styles.hint}>Scan Barcode</Text>
                </View>
            )}

          
            {cameraMode === 'PHOTO' && !loading && (
                <View style={styles.photoOverlay}>
                    <Text style={styles.photoHint}>Take a picture of your receipt</Text>
                    <TouchableOpacity onPress={captureReceipt} style={styles.captureBtn}>
                        <View style={styles.innerBtn} />
                    </TouchableOpacity>
                </View>
            )}

        </CameraView>
    </View>
  );
} 


const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  overlay: { 
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', alignItems: 'center' 
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center', alignItems: 'center', zIndex: 20
  },
  box: { width: 260, height: 110, borderWidth: 3, borderColor: '#00FF00', borderRadius: 15 },
  hint: { color: 'white', marginTop: 15, fontSize: 16, fontWeight: '500' },

  closeBtn: { 
    position: 'absolute', top: 50, right: 25, zIndex: 10, 
    backgroundColor: 'rgba(0,0,0,0.6)', padding: 12, borderRadius: 25 
  },
  closeText: { color: 'white', fontSize: 20, fontWeight: 'bold' },

  photoOverlay: { 
    position: 'absolute', bottom: 50, left: 0, right: 0, 
    alignItems: 'center', justifyContent: 'center' 
  },
  photoHint: { 
    color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 10 
  },
  captureBtn: { 
    width: 70, height: 70, borderRadius: 35, 
    backgroundColor: 'rgba(255, 255, 255, 0.3)', 
    justifyContent: 'center', alignItems: 'center', 
    borderWidth: 4, borderColor: 'white' 
  },
  innerBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'white' }
});