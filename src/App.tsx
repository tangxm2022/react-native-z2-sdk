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

// 注意: 需要确保全局只有一个实例，因为BleModule类保存着蓝牙的连接信息

const deviceManager = DeviceManager.getInstance();


const bleProtocol = deviceManager.getBleProtocol()

const App: React.FC = () => {
  // 蓝牙是否连接
  const [isConnected, setIsConnected] = useState(false);
  // 正在扫描中
  const [scaning, setScaning] = useState(false);
  // 蓝牙是否正在监听
  const [isMonitoring, setIsMonitoring] = useState(false);
  // 当前正在连接的蓝牙id
  const [connectingId, setConnectingId] = useState('');
  // 写数据
  const [writeData, setWriteData] = useState('');
  // 接收到的数据
  const [receiveData, setReceiveData] = useState('');
  // 读取的数据
  const [readData, setReadData] = useState('');
  // 输入的内容
  const [imgBase, setImgBase64] = useState('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADMAAAAzCAYAAAA6oTAqAAAAEXRFWHRTb2Z0d2FyZQBwbmdjcnVzaEB1SfMAAABQSURBVGje7dSxCQBACARB+2/ab8BEeQNhFi6WSYzYLYudDQYGBgYGBgYGBgYGBgYGBgZmcvDqYGBgmhivGQYGBgYGBgYGBgYGBgYGBgbmQw+P/eMrC5UTVAAAAABJRU5ErkJggg==');
  // 扫描的蓝牙列表
  const [data, setData] = useState<Peripheral[]>([]);

  /** 蓝牙接收的数据缓存 */
  const bleReceiveData = useRef<any[]>([]);
  /** 使用Map类型保存搜索到的蓝牙设备，确保列表不显示重复的设备 */
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
        if(imgState == 16){//开始帧

        }else if(imgState == 1){//结束帧

        }else{//中间帧

        }
        setImgBase64('data:image/png;base64,'+data)
    },
    onCmdResult(msgId,errorCode) {
       //errorCode 8:成功，非8:失败
       if(errorCode == 8){
          // 执行成功
       }
        console.log("onCmdResult",msgId,errorCode)
    },
    onDiscover: (data: Peripheral) => {
      let id;
      // 蓝牙 Mac 地址
      let macAddress;
      if (Platform.OS == 'android') {
        macAddress = data.id;
        id = macAddress;
      } else {
        // ios连接时不需要用到Mac地址，但跨平台识别同一设备时需要 Mac 地址
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
          Alert.alert('蓝牙未打开');
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
    // 断开后显示上次的扫描结果
    setData([...deviceMap.current.values()]);
    setIsConnected(false);
    setWriteData('');
    setReadData('');
    setReceiveData('');

  }



  function scan() {

    if (deviceManager.getBleState() !== BleState.On) {
      enableBluetooth();
      return;
    }

    // 重新扫描时清空列表
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
      alert('请开启手机蓝牙');
    } else {
      Alert.alert('提示', '请开启手机蓝牙', [
        {
          text: '取消',
          onPress: () => { },
        },
        {
          text: '打开',
          onPress: () => {
            deviceManager.getBleModule().enableBluetooth();
          },
        },
      ]);
    }
  }

  /** 连接蓝牙 */
  function connect(item: Peripheral) {
    setConnectingId(item.id);

    if (scaning) {
      // 当前正在扫描中，连接时关闭扫描
      deviceManager.getBleModule().stopScan().then(() => {
        setScaning(false);
      });
    }

    deviceManager.connect(item.id)
      .then(_peripheralInfo => {
        setIsConnected(true);
        // 连接成功后，列表只显示已连接的设备
        setData([item]);
      })
      .catch(_err => {
        alert('连接失败');
      })
      .finally(() => {
        setConnectingId('');
      });
  }

  /** 断开连接 */
  function disconnect() {
    deviceManager.disconnect();
    initData();
  }

  function notify(index: number) {
    console.log('notify', index);
    deviceManager.getBleModule()
      .startNotification(index)
      .then(() => {
        setIsMonitoring(true);
        alert('开启成功');
      })
      .catch(_err => {
        setIsMonitoring(false);
        alert('开启失败');
      });
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
          // 请记得指定宽高！
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
