package com.sdk.fat;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import android.graphics.Color;
import java.io.ByteArrayOutputStream;
import android.util.Log;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import java.util.ArrayList;

public class BitmapModule extends ReactContextBaseJavaModule {

    private final static ArrayList<int[]> mLinkedList = new ArrayList();

    public BitmapModule(ReactApplicationContext reactContext) {
        super(reactContext);
        mLinkedList.clear();
      
        for (int i = 0; i < 200 ; i++) {
            int[] aa = new int[477];
            for (int j = 0; j < aa.length; j++) {
                aa[j] = 0;
            }
            mLinkedList.add(aa);
        }
    }

    @Override
    public String getName() {
        return "BitmapModule";
    }

    @ReactMethod
    public void getBitmapFromPath(ReadableArray array,int w,int h, Promise promise) {

        mLinkedList.remove(0);

        int[] px = new int[array.size()];
        Log.i("test","array="+array.size());
        for (int i = 0; i < array.size(); i++) {
            switch (array.getType(i)) {
                case Number:
                    double num = array.getDouble(i);
                    px[i] = (int) num;
                    break;
              
            }
        }

        mLinkedList.add(px);

        

        try {
            // 加载Bitmap，这里以从路径加载为例
           // Bitmap bitmap = Bitmap.createBitmap(200,477, Bitmap.Config.ARGB_8888);//BitmapFactory.decodeFile(imagePath);
           int[] pxlex = new int[w*h];
           int r, g, b, a, d;
           int length =mLinkedList.size();
           a = 255;
           for(int i = 0; i < length; i++)
           {
               int[]  temp = mLinkedList.get(i);
               for (int j = 0; j < h; j++){
                   r = g = b = temp[j] & 0xff;
                   //Log.i("test","index="+(j*length + i));
                   pxlex[j*length + i] = Color.argb(a, r, g, b);
               }
           }
            


         Log.i("test","length="+array.size());

            Bitmap bitmap = Bitmap.createBitmap(pxlex, w, h, Bitmap.Config.ARGB_8888);

            if (bitmap == null) {
                promise.reject("BITMAP_LOAD_FAILED", "Failed to load bitmap from path.");
                return;
            }

            // 将Bitmap转换为字节数组
            ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.JPEG, 100, byteArrayOutputStream);
            byte[] imageBytes = byteArrayOutputStream.toByteArray();

            // 将字节数组转换为Base64字符串
            String base64String = Base64.encodeToString(imageBytes, Base64.DEFAULT);

            // 通过Promise将Base64字符串返回给JavaScript
            promise.resolve(base64String);
        } catch (Exception e) {
            promise.reject("BITMAP_PROCESSING_ERROR", e);
        }
    }
}