import { Platform, NativeModules, NativeEventEmitter } from 'react-native';
import { BleManagerDidUpdateStateEvent, BleState, Peripheral, PeripheralInfo } from 'react-native-ble-manager';
import BleModule from './BleModule';
import BleProtocol from './BleProtocol';
import { BleEventType } from './type';


const bleModule = new BleModule();

const bleProtocol = new BleProtocol();

const BitmapModule = NativeModules.BitmapModule;

const service_uuid = '5BA60001-925D-4776-9224-92F8998CD749'

const notify_uuid = '5BA60003-925D-4776-9224-92F8998CD749'

const write_uuid = '5BA60002-925D-4776-9224-92F8998CD749'

const battery_service_uuid = "0000180f-0000-1000-8000-00805f9b34fb";

const battery_read_uuid = "00002A19-0000-1000-8000-00805f9b34fb";

const deviceImgDepth = 477; //探测最大图片长度

const ocxo = 40;

interface DeviceListener {
    onConnected: () => void;
    onScan: () => void;
    onStopScan: () => void;
    onDiscover: (data: Peripheral) => void;
    onDisconnect: () => void;
    onReceiveImg: (data: string, frameNum: number) => void;
    onReceiveData: (data: number[]) => void;
    onStateChange: (state: BleState) => void;
    onCmdResult: (msgId: string, errorCode: number) => void;
}

export default class DeviceManager {


    listener: DeviceListener | null = null;
    // 蓝牙是否连接
    isConnected: boolean = false;
    // 正在扫描中
    scaning: boolean = false;
    // 蓝牙是否正在监听
    isMonitoring: boolean = false;
    // 当前正在连接的蓝牙id
    connectingId: string = '';
    // 写数据
    writeData: string = '';
    // 接收到的数据
    receiveData: string = ''
    // 读取的数据
    readData: string = ''
    // 输入的内容
    inputText: string = ''
    // 扫描的蓝牙列表
    data: Peripheral[] = [];

    /** 蓝牙接收的数据缓存 */
    tempReceiveData: any[] = [];

    bleReceiveData: any[] = [];

    mImageLinkedList: any[][] = [];

    /** 使用Map类型保存搜索到的蓝牙设备，确保列表不显示重复的设备 */
    deviceMap: Map<string, Peripheral> = new Map<string, Peripheral>();

    frameNum: number = 0;
    totalByteCount: number = 0;
    msgLength: number = 0;
    copyTotal: number = 0;
    imgState: number = 0;
    errorCode: number = 0;
    

    constructor() {
        this.addUpdateStateListener(this.handleUpdateState);
        this.addStopScanListener(this.handleStopScan);
        this.addDiscoverPeripheralListener(this.handleDiscoverPeripheral);
        this.addConnectPeripheralListener(this.handleConnectPeripheral);
        this.addDisconnectPeripheralListener(this.handleDisconnectPeripheral);
        this.addUpdateValuelListener(this.handleUpdateValue);
    }

    setDeviceListener(listener: DeviceListener) {
        this.listener = listener;
    }

    public static instance: DeviceManager = new DeviceManager();
    public static getInstance(): DeviceManager {
        return DeviceManager.instance;
    }

    //监听状态
    handleUpdateState(event: BleManagerDidUpdateStateEvent) {
        console.log('DeviceManager BleManagerDidUpdateState:', event);
        DeviceManager.getInstance().setBleState(event.state);
        DeviceManager.getInstance().listener?.onStateChange(event.state);
    }

    handleStopScan() {
        console.log('DeviceManager Scanning is stopped');
        DeviceManager.getInstance().scaning = false;
        DeviceManager.getInstance().listener?.onStopScan();
    }


    handleDiscoverPeripheral(data: Peripheral) {
        if (data.name !== null && data.name !== undefined && data.name.startsWith("MT_Z")) {
            DeviceManager.getInstance().deviceMap.set(data.id, data);
            DeviceManager.getInstance().listener?.onDiscover(data);
        }
    }
    handleConnectPeripheral(data: Peripheral) {
        console.log('DeviceManager BleManagerConnectPeripheral:', data);
        DeviceManager.getInstance().isConnected = true;
        DeviceManager.getInstance().listener?.onConnected();
    }

    handleDisconnectPeripheral(data: Peripheral) {
        console.log('DeviceManager BleManagerDisconnectPeripheral:', data);
        DeviceManager.getInstance().initData();
        DeviceManager.getInstance().isConnected = false;
        DeviceManager.getInstance().listener?.onDisconnect();
    }

    handleUpdateValue(data: any) {
        let value = data.value as String;
        let dataStr = value.toString();
        let strArray = dataStr.split(',');
        if (strArray.length < 2) {
            console.log('Dirty data');
            return;
        }
        let intArray = strArray.map((num: string) => parseInt(num));

        //console.log('receive=======data.value: data length=' + intArray.length);

        console.log('receive=======data.value: ' + value);

       // console.log('receive=======data.tempReceiveData: ' + DeviceManager.getInstance().tempReceiveData.length);

        if (DeviceManager.getInstance().tempReceiveData != null && DeviceManager.getInstance().tempReceiveData.length > 0 && DeviceManager.getInstance().tempReceiveData.length < 11) {
            let temp = [];

            for (let i = 0; i < DeviceManager.getInstance().tempReceiveData.length; i++) {
                temp.push(DeviceManager.getInstance().tempReceiveData[i]);
            }
            for (let i = 0; i < intArray.length; i++) {
                temp.push(intArray[i]);
            }
            DeviceManager.getInstance().resolverData(temp)
            DeviceManager.getInstance().tempReceiveData = []

        } else {
            DeviceManager.getInstance().resolverData(intArray)
        }



    }

    async resolverData(intArray: number[]) {

        let dataLength = intArray.length;

        let hexStr = DeviceManager.getInstance().getBleProtocol().intArrayToHex(intArray);
        if (DeviceManager.getInstance().getBleProtocol().isHead(hexStr)) {
            let msgId = DeviceManager.getInstance().getBleProtocol().getResponseCommand(hexStr);
            this.msgLength = DeviceManager.getInstance().getBleProtocol().getPacketByteLen(hexStr);
            console.log('data star frame: msgId=' + msgId + " msgLength=" + this.msgLength);
            if (msgId == '10a5') { //image data
                this.frameNum = DeviceManager.getInstance().getBleProtocol().getPacketByteFramNum(hexStr);
                this.imgState = intArray[10];
                console.log('frameNum ' + this.frameNum, ' imgState=', this.imgState);
                this.bleReceiveData = []
                this.copyTotal = dataLength - 11;

                for (let i = 0; i < this.copyTotal; i++) {
                    this.bleReceiveData.push(intArray[i + 11]);
                }


            } else {
                this.errorCode = intArray[6];
                this.bleReceiveData = []
                this.copyTotal = dataLength - 2;
                for (let i = 0; i < this.msgLength - 2; i++) {
                    this.bleReceiveData.push(intArray[8 + i]);
                }
            }



            if (this.copyTotal >= this.msgLength) {
                DeviceManager.getInstance().listener?.onCmdResult(msgId, this.errorCode);
                DeviceManager.getInstance().listener?.onReceiveData(this.bleReceiveData);
            }

        } else {
            if (this.bleReceiveData.length >= deviceImgDepth) {
                console.log('data bleReceiveData=return', this.bleReceiveData.length);
                return;
            }
            console.log('data bleReceiveData=', dataLength, this.msgLength, this.copyTotal, this.bleReceiveData.length);
            if (dataLength >= (this.msgLength - this.copyTotal)) {
                for (let i = 0; i < this.msgLength - this.copyTotal; i++) {
                    this.bleReceiveData.push(intArray[i]);
                }
                console.log('d=11====', this.bleReceiveData.length, this.bleReceiveData);
                if (this.bleReceiveData.length == deviceImgDepth) {
                    //    let argbArray= new Array(477).fill(200)
                    const base64Image = await BitmapModule.getBitmapFromPath(this.bleReceiveData, 200, deviceImgDepth);
                    DeviceManager.getInstance().listener?.onReceiveImg(base64Image, this.imgState);
                    DeviceManager.getInstance().listener?.onReceiveData(this.bleReceiveData);
                }

                this.tempReceiveData = []
                for (let i = this.msgLength - this.copyTotal; i < dataLength; i++) {
                    this.tempReceiveData.push(intArray[i]);
                }

                if (dataLength - (this.msgLength - this.copyTotal) >= 11) {
                    //继续解析
                    //Log.e(TAG, "resolverData temp===="+temp.length);
                    this.resolverData(this.tempReceiveData);
                }

            } else {
                for (let i = 0; i < dataLength; i++) {
                    this.bleReceiveData.push(intArray[i]);
                }
                this.copyTotal = dataLength + this.copyTotal;
            }
        }

    }

    addUpdateStateListener(
        listener: (data: any) => void,
        context?: any,
    ) {
        const bleListener = bleModule.addListener(
            BleEventType.BleManagerDidUpdateState,
            listener,
        );
        return bleListener;
    }

    addStopScanListener(
        listener: (data: any) => void,
        context?: any,
    ) {
        const bleListener = bleModule.addListener(
            BleEventType.BleManagerStopScan,
            listener,
        );
        return bleListener;
    }



    addDiscoverPeripheralListener(
        listener: (data: any) => void,
        context?: any,
    ) {
        const bleListener = bleModule.addListener(
            BleEventType.BleManagerDiscoverPeripheral,
            listener,
        );
        return bleListener;
    }

    addConnectPeripheralListener(
        listener: (data: any) => void,
        context?: any,
    ) {
        const bleListener = bleModule.addListener(
            BleEventType.BleManagerConnectPeripheral,
            listener,
        );
        return bleListener;
    }

    addDisconnectPeripheralListener(
        listener: (data: any) => void,
        context?: any,
    ) {
        const bleListener = bleModule.addListener(
            BleEventType.BleManagerDisconnectPeripheral,
            listener,
        );
        return bleListener;
    }

    addUpdateValuelListener(
        listener: (data: any) => void,
        context?: any,
    ) {
        const bleListener = bleModule.addListener(
            BleEventType.BleManagerDidUpdateValueForCharacteristic,
            listener,
        );
        return bleListener;
    }



    getBleModule() {
        return bleModule;
    }


    getBleProtocol() {
        return bleProtocol;
    }


    start() {
        bleModule.start();
    }

    setBleState(state: BleState) {
        bleModule.bleState = state;
    }

    getBleState() {
        return bleModule.bleState;
    }

    initData() {
        bleModule.initUUID();
        this.scaning = false;
        this.isConnected = false;
        this.deviceMap = new Map<string, Peripheral>();
    }

    //读取电量
    getDeviceBattery(): Promise<number> {

        return new Promise((resolve, reject) => {
            bleModule.readByUuid(battery_service_uuid, battery_read_uuid)
                .then((value) => {
                
                    resolve(parseInt(value, 16));
                })
                .catch(_err => {
                    resolve(0);
                });

        });
    }


    //设置深度
    setDeviceDepth(depth: number): Promise<boolean> {
        let cmdStr = bleProtocol.addMsgIdProtocol("10c0", "000000" + bleProtocol.intArrayToHex([depth]));
        return new Promise((resolve, reject) => {
            this.write(cmdStr)
                .then(() => {

                    //同步CD命令
                    let delayValue = 0xa5 + depth * deviceImgDepth * 2 + 24;
                    let delayByte = [0x00, 0xa5, (delayValue >> 8 & 0xff), delayValue & 0xff];
                    cmdStr = bleProtocol.addMsgIdProtocol("10cd", DeviceManager.getInstance().getBleProtocol().intArrayToHex(delayByte))
                    bleModule.writeByUuid(cmdStr, service_uuid, write_uuid);
                    resolve(true);
                })
                .catch(_err => {
                    resolve(false);
                });

        });
    }

    //设置周期
    setDeviceSendCycle(leve: number): Promise<boolean> {
        let value = ocxo * leve * 1000;
        let cmdStr = bleProtocol.addMsgIdProtocol("10c5", "000" + value.toString(16));
        return new Promise((resolve, reject) => {
            this.write(cmdStr)
                .then(() => {
                    resolve(true);
                })
                .catch(_err => {
                    resolve(false);
                });

        });
    }



    //设置增益
    setDeviceGain(leve: number): Promise<boolean> {
        let cmdStr = bleProtocol.addMsgIdProtocol("10c1", "000000" + bleProtocol.intArrayToHex([leve]))
        return new Promise((resolve, reject) => {
            this.write(cmdStr)
                .then(() => {
                    resolve(true);
                })
                .catch(_err => {
                    resolve(false);
                });

        });
    }

    setDeviceOpen(): Promise<boolean> {
        let cmd = bleProtocol.addMsgIdProtocol("10c8", "000000" + bleProtocol.intArrayToHex([1]));
        return new Promise((resolve, reject) => {
            this.write(cmd)
                .then(() => {
                    resolve(true);
                })
                .catch(_err => {
                    resolve(false);
                });

        });
    }

    write(data: any): Promise<void> {
        console.log('DeviceManager write', data);
        return bleModule.writeByUuid(data, service_uuid, write_uuid);
    }



    connect(id: string): Promise<PeripheralInfo> {
        return new Promise((resolve, reject) => {
            bleModule
                .connect(id)
                .then(_peripheralInfo => {
                    this.connectingId = id
                    this.isConnected = true

                    DeviceManager.getInstance().getBleModule()
                        .startNotificationByUuid(service_uuid, notify_uuid)
                        .then(() => {
                            console.log('DeviceManager Notification started');
                            DeviceManager.getInstance().isMonitoring = true;

                            //初始化数据
                            //打开安图像功能
                            this.setDeviceOpen().then(isSuccess => {
                                console.log('DeviceManager 开启按钮图像功能 成功');
                            })
                                .catch(error => {
                                    console.log('DeviceManager 开启按钮图像功能 失败');
                                });

                        })
                        .catch(_err => {
                            console.log('DeviceManager Notification fail');
                            DeviceManager.getInstance().isMonitoring = false;
                        });

                    resolve(_peripheralInfo);
                })
                .catch(_err => {
                    this.isConnected = false
                    reject(_err);
                })
                .finally(() => {
                    this.connectingId = ''
                });

        });
    }

    disconnect() {
        bleModule.disconnect();
    }
}
