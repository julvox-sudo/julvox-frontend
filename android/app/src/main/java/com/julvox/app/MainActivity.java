package com.julvox.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

public final class MainActivity extends Activity {
    private static final String APP_SCHEME = "https";
    private static final String APP_HOST = "julvox.com";
    private static final String START_URL = "https://julvox.com/index.html";
    private static final String BRIDGE_NAME = "JulvoxSecureSession";

    private WebView webView;
    private SecureSessionBridge secureSessionBridge;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        WebView.startSafeBrowsing(this, null);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(10, 10, 15));
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        configureWebView(webView);
        setContentView(webView);

        WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
            .setDomain(APP_HOST)
            .setHttpAllowed(false)
            .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();

        ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }
        });

        webView.setWebViewClient(new LocalOnlyWebViewClient(assetLoader));
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                request.deny();
            }
        });

        secureSessionBridge = new SecureSessionBridge(getApplicationContext());
        webView.addJavascriptInterface(secureSessionBridge, BRIDGE_NAME);

        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            webView.loadUrl(START_URL);
        }
    }

    private static void configureWebView(WebView view) {
        WebSettings settings = view.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setGeolocationEnabled(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSaveFormData(false);
        CookieManager.getInstance().setAcceptCookie(false);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onPause() {
        webView.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.removeJavascriptInterface(BRIDGE_NAME);
            webView.stopLoading();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    private final class LocalOnlyWebViewClient extends WebViewClientCompat {
        private final WebViewAssetLoader assetLoader;

        LocalOnlyWebViewClient(WebViewAssetLoader assetLoader) {
            this.assetLoader = assetLoader;
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            return assetLoader.shouldInterceptRequest(request.getUrl());
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (isTrustedTopLevelUrl(uri)) return false;
            if (("https".equals(uri.getScheme()) || "http".equals(uri.getScheme())) && request.isForMainFrame()) {
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (RuntimeException ignored) {
                    // Fail closed: an unavailable external handler must not make the page trusted.
                }
            }
            return true;
        }

        private boolean isTrustedTopLevelUrl(Uri uri) {
            if (!APP_SCHEME.equals(uri.getScheme()) || !APP_HOST.equals(uri.getHost())) return false;
            String path = uri.getPath();
            return path == null || path.isEmpty() || "/".equals(path) || "/index.html".equals(path);
        }
    }
}
