package com.hans.chessapp

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.lifecycle.lifecycleScope
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {
  private lateinit var webView: WebView
  private lateinit var userLabel: TextView
  private lateinit var signOutBtn: Button
  private lateinit var credentialManager: CredentialManager

  @SuppressLint("SetJavaScriptEnabled")
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val firebaseUser = FirebaseAuth.getInstance().currentUser
    if (firebaseUser == null) {
      openLogin()
      return
    }

    setContentView(R.layout.activity_main)
    credentialManager = CredentialManager.create(this)

    userLabel = findViewById(R.id.userLabel)
    signOutBtn = findViewById(R.id.signOutBtn)
    webView = findViewById(R.id.webView)
    userLabel.text = getString(
      R.string.signed_in_as,
      firebaseUser.email ?: firebaseUser.displayName ?: "Player"
    )

    signOutBtn.setOnClickListener {
      FirebaseAuth.getInstance().signOut()
      lifecycleScope.launch {
        runCatching { credentialManager.clearCredentialState(ClearCredentialStateRequest()) }
        openLogin()
      }
    }

    webView.webViewClient = WebViewClient()
    webView.webChromeClient = WebChromeClient()
    webView.settings.javaScriptEnabled = true
    webView.settings.domStorageEnabled = true
    webView.settings.useWideViewPort = true
    webView.settings.loadWithOverviewMode = true
    webView.settings.builtInZoomControls = false
    webView.settings.cacheMode = WebSettings.LOAD_DEFAULT
    webView.addJavascriptInterface(
      NativeAuthBridge(firebaseUser.displayName ?: "", firebaseUser.email ?: ""),
      "NativeAuth"
    )
    webView.loadUrl("file:///android_asset/index.html?native=1")
  }

  override fun onBackPressed() {
    if (this::webView.isInitialized && webView.canGoBack()) {
      webView.goBack()
      return
    }
    super.onBackPressed()
  }

  private fun openLogin() {
    startActivity(Intent(this, LoginActivity::class.java))
    finish()
  }
}

class NativeAuthBridge(private val displayName: String, private val email: String) {
  @JavascriptInterface
  fun getDisplayName(): String = displayName

  @JavascriptInterface
  fun getEmail(): String = email
}
