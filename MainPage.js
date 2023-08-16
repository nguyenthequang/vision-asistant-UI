import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Button,
  SafeAreaView,
  Image,
} from "react-native";
import { Audio } from "expo-av"; // Import Expo Audio module for sound playback
import { FlatList, ScrollView } from "react-native-gesture-handler";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Camera } from "expo-camera";
import { shareAsync } from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import { StatusBar } from "expo-status-bar";

const MainPage = ({ navigation }) => {
  const [messages, setMessages] = useState([
    {
      text: "bot",
      isUser: false,
      isAudio: false,
      audio: undefined,
      isPic: false,
      pic: undefined,
    },
    {
      text: "user",
      isUser: true,
      isAudio: false,
      audio: undefined,
      isPic: false,
      pic: undefined,
    },
  ]);
  const [inputText, setInputText] = useState("");

  // Recording states
  const [recording, setRecording] = useState();
  const [recordings, setRecordings] = useState([]);

  // Photo states
  let cameraRef = useRef();
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState();
  const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState();
  const [photo, setPhoto] = useState();

  const scrollViewRef = useRef()

  useEffect(() => {
    (async () => {
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      const mediaLibraryPermission =
        await MediaLibrary.requestPermissionsAsync();
      setHasCameraPermission(cameraPermission.status === "granted");
      setHasMediaLibraryPermission(mediaLibraryPermission.status === "granted");
    })();
  }, []);

  // Function to handle microphone button press
  const getDurationFormatted = (millis) => {
    const minutes = millis / 1000 / 60;
    const minutesDisplay = Math.floor(minutes);
    const seconds = Math.round((minutes - minutesDisplay) * 60);
    const secondsDisplay = seconds < 10 ? `0${seconds}` : seconds;
    return `${minutesDisplay}:${secondsDisplay}`;
  };

  const handleMicPress = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();

      if (permission.status == "granted") {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording } = await Audio.Recording.createAsync(
          Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
        );
        console.log("RECORDING");
        setRecording(recording);
      } else {
        console.log("Please grant permission");
      }
    } catch (error) {
      console.log("Fail to start recording", error);
    }
  };

  const handleMicRelease = async () => {
    setRecording(undefined);
    await recording.stopAndUnloadAsync();
    console.log("STOP RECORDING");
    console.log(recording.getURI());

    let updateRecordings = [...recordings];
    const { sound, status } = await recording.createNewLoadedSoundAsync();
    updateRecordings.push({
      sound: sound,
      duration: getDurationFormatted(status.durationMillis),
      file: recording.getURI(),
    });

    setMessages([
      ...messages,
      {
        text: "",
        isUser: true,
        isAudio: true,
        audio: {
          sound: sound,
          duration: getDurationFormatted(status.durationMillis),
          file: recording.getURI(),
        },
        isPic: false,
        pic: undefined,
      },
    ]);

    setRecordings(updateRecordings);
  };

  // Function to handle camera button press

  let takePic = async () => {
    let options = {
      quality: 1,
      base64: true,
      exif: false,
    };

    let newPhoto = await cameraRef.current.takePictureAsync(options);
    setPhoto(newPhoto);
  };

  if (photo) {
    let sendPic = () => {
      setMessages([
        ...messages,
        {
          text: "",
          isUser: true,
          isAudio: false,
          audio: undefined,
          isPic: true,
          pic: photo,
        },
      ]);
      setPhoto(undefined);
      setIsTakingPhoto(false);
    };

    let savePhoto = () => {
      MediaLibrary.saveToLibraryAsync(photo.uri).then(() => {
        setPhoto(undefined);
      });
    };

    return (
      <SafeAreaView style={styles.container}>
        <Image
          style={styles.photo_preview}
          source={{ uri: "data:image/jpg;base64," + photo.base64 }}
        />
        <Button title="Send" onPress={sendPic} />
        {hasMediaLibraryPermission ? (
          <Button title="Save" onPress={savePhoto} />
        ) : undefined}
        <Button title="Discard" onPress={() => setPhoto(undefined)} />
      </SafeAreaView>
    );
  }

  const handleCameraPress = () => {
    // Implement camera functionality
  };

  // Function to handle message submission
  const handleSubmit = () => {
    setMessages([
      ...messages,
      { text: "This is an AI--generated response.", isUser: false },
    ]);

    // Add user message to chat
    setMessages([...messages, { text: inputText, isUser: true }]);

    // Clear input field
    setInputText("");
  };

  if (isTakingPhoto) {
    return (
      <Camera style={styles.photo_container} ref={cameraRef}>
        <View style={styles.photo_buttonContainer}>
          <Button title="Take Pic" onPress={takePic} />
        </View>
        <View style={styles.photo_buttonContainer}>
          <Button title="Back" onPress={() => setIsTakingPhoto(false)} />
        </View>
        <StatusBar style="auto" />
      </Camera>
    );
  } else {
    return (
      <View style={styles.container}>
        {/* Chat messages */}
        <ScrollView
          style={styles.chatContainer}
          ref={scrollViewRef}
          onContentSizeChange={() => {
            scrollViewRef?.current?.scrollToEnd({ animated: true });
          }}
        >
          {messages.map((message, index) => {
            // console.log(message);
            return (
              <View
                key={index}
                style={
                  message.isUser
                    ? message.isPic
                      ? styles.userMessagePic
                      : styles.userMessage
                    : styles.aiMessage
                }
              >
                {message.isAudio ? (
                  <Button
                    style={styles.button}
                    onPress={() => message.audio.sound.replayAsync()}
                    title="Play"
                  ></Button>
                ) : message.isPic ? (
                  <Image
                    style={[styles.photo_preview]}
                    source={{
                      uri: "data:image/jpg;base64," + message.pic.base64,
                    }}
                  />
                ) : (
                  <Text style={styles.messageText}>{message.text}</Text>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Speech to text input */}
        <View style={{ flexDirection: "row" }}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={(inputText) => {
              setInputText(inputText);
            }}
            placeholder="Type your message..."
          />

          {/* Send button */}
          <TouchableOpacity style={styles.sendButton} onPress={handleSubmit}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>

        {/* Mic and camera buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.buttonRow, { borderTopLeftRadius: 20 }]}
            onLongPress={handleMicPress}
            onPressOut={handleMicRelease}
          >
            <Ionicons name="md-mic" size={150} color="#EBEBEB" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.buttonRow, { borderTopRightRadius: 20 }]}
            onPress={() => setIsTakingPhoto(true)}
          >
            <Ionicons name="camera-outline" size={150} color="#EBEBEB" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  photo_container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  photo_buttonContainer: {
    backgroundColor: "#fff",
    alignSelf: "flex-end",
  },
  photo_preview: {
    alignSelf: "stretch",
    flex: 1,
  },
  container: {
    width: "100%",
    height: "100%",
    paddingBottom: 0,
    paddingHorizontal: 0,
  },
  chatContainer: {
    flex: 1,
    marginBottom: 20,
  },
  userMessage: {
    backgroundColor: "#DCF8C6",
    alignSelf: "flex-end",
    padding: 10,
    borderRadius: 10,
    marginBottom: 5,
  },
  userMessagePic: {
    backgroundColor: "#DCF8C6",
    alignSelf: "flex-end",
    padding: 10,
    borderRadius: 10,
    marginBottom: 5,
    width: "80%",
    height: 500,
  },
  aiMessage: {
    backgroundColor: "#E4E4E4",
    alignSelf: "flex-start",
    padding: 10,
    borderRadius: 10,
    marginBottom: 5,
  },
  messageText: {
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
    flex: 5,
  },
  sendButton: {
    alignSelf: "flex-end",
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  sendButtonText: {
    color: "white",
  },
  buttonContainer: {
    flexDirection: "row",
    height: "33%",
  },
  buttonRow: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007AFF",
  },
});

export default MainPage;
