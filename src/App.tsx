import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  ListRenderItemInfo,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View, Image,
} from 'react-native';
import {
  Peripheral,
} from 'react-native-ble-manager';

import Header from './Header';
import { BleEventType, BleState } from './components/sdk/fat/type';
import DeviceManager from './components/sdk/fat/DeviceManager';
import FastImage from 'react-native-fast-image';

// Note: It is necessary to ensure that there is only one instance globally, as the BleModule class stores Bluetooth connection information

const deviceManager = DeviceManager.getInstance();


const bleProtocol = deviceManager.getBleProtocol()

const App: React.FC = () => {
  // Is Bluetooth connected
  const [isConnected, setIsConnected] = useState(false);
  // 正在扫描中
  const [scaning, setScaning] = useState(false);
  // 蓝牙是否正在监听
  const [isMonitoring, setIsMonitoring] = useState(false);
  // 当前正在连接的蓝牙id
  const [connectingId, setConnectingId] = useState('');

  // 输入的内容
  const [imgBase, setImgBase64] = useState('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADMAAAAzCAYAAAA6oTAqAAAAEXRFWHRTb2Z0d2FyZQBwbmdjcnVzaEB1SfMAAABQSURBVGje7dSxCQBACARB+2/ab8BEeQNhFi6WSYzYLYudDQYGBgYGBgYGBgYGBgYGBgZmcvDqYGBgmhivGQYGBgYGBgYGBgYGBgYGBgbmQw+P/eMrC5UTVAAAAABJRU5ErkJggg==');
  // 扫描的蓝牙列表
  const [data, setData] = useState<Peripheral[]>([]);

  /** Use Map type to save the searched Bluetooth devices and ensure that the list does not display duplicate devices */
  const deviceMap = useRef(new Map<string, Peripheral>());

  deviceManager.setDeviceListener({
    onConnected: () => {
      setIsConnected(true);
      setIsMonitoring(true);
    },
    onDisconnect: () => {
      setIsConnected(false);
      setIsMonitoring(false);
      initData();
    },
    onScan: () => {
      setScaning(true);
    },
    onStopScan: () => {
      setScaning(false);
    },
    onReceiveImg: (data: string,imgState:number) => {
        //console.log('onReceiveImg',data,imgState);
        if(imgState == 16){//Start Frame

        }else if(imgState == 1){//End frame

        }else{//Intermediate frame

        }
        setImgBase64('data:image/png;base64,'+data)
    },
    onCmdResult(msgId,errorCode) {
       //errorCode 8:成功，非8:失败
       if(errorCode == 8){
          // Execution succeeded

       }
        console.log("onCmdResult",msgId,errorCode)
    },
    onDiscover: (data: Peripheral) => {
      let id;
      // Bluetooth Mac address
      let macAddress;
      if (Platform.OS == 'android') {
        macAddress = data.id;
        id = macAddress;
      } else {
        // Mac address is not required for iOS connection, but it is required for cross platform recognition of the same device
        macAddress = bleProtocol.getMacFromAdvertising(data);
        id = data.id;
      }
     
        deviceMap.current.set(data.id, data);
        setData([...deviceMap.current.values()]);
      
    },
    onReceiveData: (data: number[]) => {
    },
    onStateChange(state) {
      switch (state) {
        case BleState.On:
          break
        case BleState.Off:
          Alert.alert('Bluetooth not turned on');
          break;
        case BleState.TurningOn:
          break;
        case BleState.TurningOff:
          break;
        case BleState.Unknown:
          break;
        case BleState.Resetting:
          break;
        case BleState.Unsupported:
          break;
        case BleState.Unauthorized:
      }
    }
  });

  useEffect(() => {
    deviceManager.start();
  }, []);


  function initData() {
    // Display last scan result after disconnection
    setData([...deviceMap.current.values()]);
    setIsConnected(false);

  }



  function scan() {

    if (deviceManager.getBleState() !== BleState.On) {
      enableBluetooth();
      return;
    }

    // Clear list during rescan
    deviceMap.current.clear();

    setData([]);

    deviceManager.getBleModule()
      .scan()
      .then(() => {
        setScaning(true);
      })
      .catch(_err => {
        setScaning(false);
      });
  }

  function enableBluetooth() {
    if (Platform.OS === 'ios') {
      alert('Please enable Bluetooth on your phone');
    } else {
      Alert.alert('prompt', 'Please enable Bluetooth on your phone', [
        {
          text: 'Cancel',
          onPress: () => { },
        },
        {
          text: 'Open',
          onPress: () => {
            deviceManager.getBleModule().enableBluetooth();
          },
        },
      ]);
    }
  }

  /** Connecting Bluetooth */
  function connect(item: Peripheral) {
    setConnectingId(item.id);

    if (scaning) {
      // Currently scanning, close scanning when connecting
      deviceManager.getBleModule().stopScan().then(() => {
        setScaning(false);
      });
    }

    deviceManager.connect(item.id)
      .then(_peripheralInfo => {
        setIsConnected(true);
        // After successful connection, the list only shows connected devices
        setData([item]);
      })
      .catch(_err => {
        alert('connect failed');
      })
      .finally(() => {
        setConnectingId('');
      });
  }

  /** Disconnect */
  function disconnect() {
    deviceManager.disconnect();
    initData();
  }




  function alert(text: string) {
    Alert.alert('提示', text, [{ text: '确定', onPress: () => { } }]);
  }

  function renderItem(item: ListRenderItemInfo<Peripheral>) {
    const data = item.item;
    const disabled = !!connectingId && connectingId !== data.id;
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        disabled={disabled || isConnected}
        onPress={() => {
          connect(data);
        }}
        style={[styles.item, { opacity: disabled ? 0.5 : 1 }]}>
        <View style={{ flexDirection: 'row' }}>
          <Text style={{ color: 'black' }}>{data.name ? data.name : ''}</Text>
          <Text style={{ marginLeft: 50, color: 'red' }}>
            {connectingId === data.id ? '连接中...' : ''}
          </Text>
        </View>
        <Text>{data.id}</Text>
      </TouchableOpacity>
    );
  }




  return (
    <SafeAreaView style={styles.container}>
      <Header
        isConnected={isConnected}
        scaning={scaning}
        disabled={scaning || !!connectingId}
        onPress={isConnected ? disconnect : scan}
      />
      <FlatList
        renderItem={renderItem}
        keyExtractor={item => item.id}
        data={data}
        extraData={connectingId}
      />

      <View style={{ flex: 1 }}>
        {isConnected && (
          <FastImage
            style={{
              width: '100%',
              height: 477
            }}
            resizeMode={FastImage.resizeMode.stretch}
            source={{
              uri: imgBase,
              priority: FastImage.priority.high,
            }}
           
          />
        )}
      </View>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  item: {
    flexDirection: 'column',
    borderColor: 'rgb(235,235,235)',
    borderStyle: 'solid',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingLeft: 10,
    paddingVertical: 8,
  },
});

export default App;
