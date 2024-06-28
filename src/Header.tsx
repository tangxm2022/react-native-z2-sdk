import React, { useState, useRef } from 'react';
import { StyleSheet, Text, Image, TouchableOpacity, View, PermissionsAndroid, Button, Alert } from 'react-native';
import DeviceManager from './components/sdk/fat/DeviceManager';

interface HeaderProps {
  isConnected: boolean;
  scaning: boolean;
  disabled: boolean;
  onPress: () => void;
}

const requestCameraPermission = async () => {
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      {
        title: "Cool Photo App LOCATION Permission",
        message:
          "Cool Photo App needs access to your LOCATION " +
          "so you can take awesome pictures.",
        buttonNeutral: "Ask Me Later",
        buttonNegative: "Cancel",
        buttonPositive: "OK"
      }
    );
    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      console.log("You can use the LOCATION");
    } else {
      console.log("Camera permission denied");
    }
  } catch (err) {
    console.warn(err);
  }
};

const Header: React.FC<HeaderProps> = ({
  isConnected,
  scaning,
  disabled,
  onPress,
}) => {

  const setDeviceSendCycle = () => {
    DeviceManager.getInstance().setDeviceSendCycle(40).then(isSuccess => {
      if (isSuccess) {
        Alert.alert("Execution succeeded")
      } else {
        Alert.alert("Execution failed")
      }
    })
      .catch(error => {
        console.error('检查外设连接状态时出错:', error);
      });
    ;
  };

  const setDeviceDepth = () => {
    DeviceManager.getInstance().setDeviceDepth(2).then(isSuccess => {
      if (isSuccess) {
        Alert.alert("Execution succeeded")
      } else {
        Alert.alert("Execution failed")
      }
    })
      .catch(error => {
        console.error('Error checking peripheral connection status:', error);
      });
    

  };

  const setDeviceGain = () => {
    DeviceManager.getInstance().setDeviceGain(40).then(isSuccess => {
      if (isSuccess) {
        Alert.alert("Execution succeeded")
      } else {
        Alert.alert("Execution failed")
      }
    })
      .catch(error => {
        console.error('Error checking peripheral connection status:', error);
      });
    ;

  };

  const getBattery = () => {
    DeviceManager.getInstance().getDeviceBattery().then(value => {

      if (value < 32) {
        Alert.alert("The current battery level is:"+value+" Low battery, please charge.")
       
      }else{
        Alert.alert("The current battery level is:"+value)
      }
      
    })
      .catch(error => {
        console.error('Error checking peripheral connection status:', error);
      });
    ;

  };

  const [textValue, setTextValue] = useState('base65');



  return (
    <View style={styles.container}>
      <View style={styles.container}>

        <Button title="Check permission" onPress={requestCameraPermission} />


      </View>
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.buttonView, { opacity: disabled ? 0.7 : 1 }]}
        disabled={disabled}
        onPress={onPress}>
        <Text style={[styles.buttonText]}>
          {scaning ? 'Searching' : isConnected ? 'Disconnect device' : 'Scan devices'}
        </Text>
      </TouchableOpacity>

      <Text style={{ marginLeft: 10, marginTop: 10 }}>
        {isConnected ? 'The currently connected device' : 'Discovered device'}
      </Text>


      <View>
        {isConnected && (
          <>

    
            <View style={{ marginLeft: 10, marginTop: 10 }}>
              <Button title="Set device depth" onPress={setDeviceDepth} />
            </View>
            <View style={{ marginLeft: 10, marginTop: 10 }}>
              <Button title="Set device gain" onPress={setDeviceGain} />
            </View>
            <View style={{ marginLeft: 10, marginTop: 10 }}>
              <Button title="Get set battery level" onPress={getBattery} />
            </View>
          </>
        )}
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  buttonView: {
    backgroundColor: 'rgb(33, 150, 243)',
    paddingHorizontal: 10,
    marginHorizontal: 10,
    borderRadius: 5,
    marginTop: 10,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
  },
});

export default Header;
