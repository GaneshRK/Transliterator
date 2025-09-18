import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Button,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import  Camera  from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import Sanscript from "sanscript";
import Constants from "expo-constants";

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [image, setImage] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef(null);

  // Get API key safely
  const apiKey =
    Constants.expoConfig?.extra?.googleVisionApiKey ||
    "YOUR_FALLBACK_KEY_HERE";

  // Request camera permission
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  // Take photo from camera
  const takePhoto = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ base64: true });
      setImage(photo.uri);
      processImage(photo.base64);
    }
  };

  // Pick image from gallery
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      base64: true,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      processImage(result.assets[0].base64);
    }
  };

  // Send image to Google Vision API
  const processImage = async (base64String) => {
    if (!base64String) return;
    setLoading(true);

    try {
      const response = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          requests: [
            {
              image: { content: base64String },
              features: [{ type: "TEXT_DETECTION" }],
            },
          ],
        }
      );

      const detectedText =
        response.data.responses[0]?.fullTextAnnotation?.text || "";
      setText(detectedText);

      // Transliterate to Hindi (Devanagari)
      const translit = Sanscript.t(detectedText, "itrans", "devanagari");
      console.log("Transliterated:", translit);
      Alert.alert("Transliteration", translit);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to process the image. Check console.");
    } finally {
      setLoading(false);
    }
  };

  if (hasPermission === null) return <View />;
  if (hasPermission === false) return <Text>No access to camera</Text>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Camera style={styles.camera} ref={cameraRef} />
      <View style={styles.buttonContainer}>
        <Button title="Take Photo" onPress={takePhoto} />
        <Button title="Pick Image" onPress={pickImage} />
      </View>
      {loading && <ActivityIndicator size="large" color="#0000ff" />}
      {image && <Image source={{ uri: image }} style={styles.preview} />}
      {text !== "" && <Text style={styles.result}>{text}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
  camera: {
    width: 300,
    height: 400,
    marginBottom: 20,
    borderRadius: 10,
    overflow: "hidden",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 300,
    marginBottom: 10,
  },
  preview: {
    width: 250,
    height: 250,
    margin: 10,
    borderRadius: 10,
  },
  result: {
    margin: 10,
    fontSize: 16,
    textAlign: "center",
  },
});
