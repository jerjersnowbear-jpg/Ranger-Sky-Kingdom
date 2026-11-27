package com.snowmastered.ranger;
import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import java.io.InputStream;
public class MainActivity extends Activity {
  private WebView view;
  private static final String ORIGIN="https://appassets.androidplatform.net/";
  @Override public void onCreate(Bundle state){super.onCreate(state);view=new WebView(this);view.setBackgroundColor(Color.rgb(18,42,59));WebSettings s=view.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setMediaPlaybackRequiresUserGesture(true);view.setWebViewClient(new WebViewClient(){
    @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return !r.getUrl().toString().startsWith(ORIGIN);}
    @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){String u=r.getUrl().toString();if(!u.startsWith(ORIGIN))return new WebResourceResponse("text/plain","utf-8",null);String p=r.getUrl().getPath().substring(1);if(p.contains(".."))return new WebResourceResponse("text/plain","utf-8",null);try{InputStream in=getAssets().open(p);String mime=p.endsWith(".html")?"text/html":p.endsWith(".js")?"application/javascript":p.endsWith(".jpg")?"image/jpeg":p.endsWith(".png")?"image/png":p.endsWith(".webmanifest")?"application/manifest+json":"application/octet-stream";return new WebResourceResponse(mime,"utf-8",in);}catch(Exception e){return new WebResourceResponse("text/plain","utf-8",null);}}
  });setContentView(view);immersive();view.loadUrl(ORIGIN+"index.html?native=1");}
  private void immersive(){if(android.os.Build.VERSION.SDK_INT>=30){getWindow().setDecorFitsSystemWindows(false);WindowInsetsController c=getWindow().getInsetsController();if(c!=null){c.hide(WindowInsets.Type.systemBars());c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);}}else getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY|View.SYSTEM_UI_FLAG_LAYOUT_STABLE|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);}
  @Override public void onWindowFocusChanged(boolean f){super.onWindowFocusChanged(f);if(f)immersive();}
  @Override protected void onPause(){super.onPause();if(view!=null){view.evaluateJavascript("if(typeof pause==='function')pause()",null);view.onPause();}}
  @Override protected void onResume(){super.onResume();if(view!=null)view.onResume();}
  @Override public void onBackPressed(){if(view!=null)view.evaluateJavascript("if(typeof pause==='function' && playing && !paused)pause();else if(typeof menu==='function')menu()",null);}
  @Override protected void onDestroy(){if(view!=null){view.destroy();view=null;}super.onDestroy();}
}
