package com.hans.chessapp

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.lifecycle.lifecycleScope
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {
  private lateinit var signInButton: Button
  private lateinit var subtitle: TextView
  private lateinit var firebaseAuth: FirebaseAuth
  private lateinit var credentialManager: CredentialManager

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_login)

    firebaseAuth = FirebaseAuth.getInstance()
    credentialManager = CredentialManager.create(this)

    if (firebaseAuth.currentUser != null) {
      openGame()
      return
    }

    signInButton = findViewById(R.id.googleSignInBtn)
    subtitle = findViewById(R.id.loginSubtitle)

    signInButton.setOnClickListener { signInWithGoogleCredentialManager() }
  }

  private fun signInWithGoogleCredentialManager() {
    val googleIdOption = GetGoogleIdOption.Builder()
      .setFilterByAuthorizedAccounts(false)
      .setServerClientId(getString(R.string.default_web_client_id))
      .setAutoSelectEnabled(false)
      .build()

    val request = GetCredentialRequest.Builder()
      .addCredentialOption(googleIdOption)
      .build()

    lifecycleScope.launch {
      try {
        val result = credentialManager.getCredential(this@LoginActivity, request)
        val credential = result.credential

        if (credential !is CustomCredential ||
          credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
        ) {
          subtitle.text = getString(R.string.login_failed_try_again)
          Toast.makeText(
            this@LoginActivity,
            "Unsupported credential type.",
            Toast.LENGTH_LONG
          ).show()
          return@launch
        }

        val googleIdTokenCredential = try {
          GoogleIdTokenCredential.createFrom(credential.data)
        } catch (_: GoogleIdTokenParsingException) {
          subtitle.text = getString(R.string.login_failed_try_again)
          Toast.makeText(
            this@LoginActivity,
            "Could not parse Google ID token.",
            Toast.LENGTH_LONG
          ).show()
          return@launch
        }

        val firebaseCredential =
          GoogleAuthProvider.getCredential(googleIdTokenCredential.idToken, null)

        firebaseAuth.signInWithCredential(firebaseCredential).addOnCompleteListener { authTask ->
          if (authTask.isSuccessful) {
            openGame()
          } else {
            subtitle.text = getString(R.string.login_failed_try_again)
            Toast.makeText(
              this@LoginActivity,
              authTask.exception?.localizedMessage ?: "Firebase auth failed",
              Toast.LENGTH_LONG
            ).show()
          }
        }
      } catch (e: Exception) {
        subtitle.text = getString(R.string.login_failed_try_again)
        Toast.makeText(
          this@LoginActivity,
          e.localizedMessage ?: "Sign-in failed",
          Toast.LENGTH_LONG
        ).show()
      }
    }
  }

  private fun openGame() {
    startActivity(Intent(this, MainActivity::class.java))
    finish()
  }

  override fun onStart() {
    super.onStart()
    if (firebaseAuth.currentUser == null) {
      lifecycleScope.launch {
        runCatching { credentialManager.clearCredentialState(ClearCredentialStateRequest()) }
      }
    }
  }
}
