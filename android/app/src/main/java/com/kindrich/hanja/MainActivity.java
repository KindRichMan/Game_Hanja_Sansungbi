package com.kindrich.hanja;

import android.app.AlertDialog;
import android.content.Intent;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;

import com.getcapacitor.BridgeActivity;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

import java.util.Locale;

public class MainActivity extends BridgeActivity {
    private static final int REQUEST_CODE_GOOGLE_SIGN_IN = 7001;
    private TextToSpeech textToSpeech;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        textToSpeech = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS) {
                int result = textToSpeech.setLanguage(Locale.KOREAN);
                if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                    textToSpeech.setLanguage(Locale.getDefault());
                }
                textToSpeech.setSpeechRate(0.9f);
            }
        });

        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().addJavascriptInterface(new HanjaNativeTts(), "HanjaNativeTts");
            bridge.getWebView().addJavascriptInterface(new HanjaNativeAuth(), "HanjaNativeAuth");
        }
    }

    @Override
    public void onBackPressed() {
        new AlertDialog.Builder(this)
            .setMessage("\uC885\uB8CC\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?")
            .setNegativeButton("\uCDE8\uC18C", null)
            .setPositiveButton("\uC885\uB8CC", (dialog, which) -> finish())
            .show();
    }

    @Override
    public void onDestroy() {
        if (textToSpeech != null) {
            textToSpeech.stop();
            textToSpeech.shutdown();
        }
        super.onDestroy();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode != REQUEST_CODE_GOOGLE_SIGN_IN) return;
        if (bridge == null || bridge.getWebView() == null) return;

        String script;
        if (resultCode == RESULT_OK && data != null) {
            try {
                Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
                GoogleSignInAccount account = task.getResult(ApiException.class);
                String email = account != null && account.getEmail() != null ? account.getEmail() : "";
                String idToken = account != null && account.getIdToken() != null ? account.getIdToken() : "";

                String escapedEmail = email.replace("\\", "\\\\").replace("'", "\\'");
                String escapedToken = idToken.replace("\\", "\\\\").replace("'", "\\'");
                script = "window.__nativeGoogleAuthResult && window.__nativeGoogleAuthResult({ok:true,email:'" + escapedEmail + "',idToken:'" + escapedToken + "'});";
            } catch (Exception e) {
                String message = e.getMessage() == null ? "signin_failed" : e.getMessage().replace("\\", "\\\\").replace("'", "\\'");
                script = "window.__nativeGoogleAuthResult && window.__nativeGoogleAuthResult({ok:false,error:'" + message + "'});";
            }
        } else {
            script = "window.__nativeGoogleAuthResult && window.__nativeGoogleAuthResult({ok:false,error:'cancelled'});";
        }

        String finalScript = script;
        runOnUiThread(() -> bridge.getWebView().evaluateJavascript(finalScript, null));
    }

    private class HanjaNativeTts {
        @JavascriptInterface
        public void speak(String text) {
            if (textToSpeech == null || text == null || text.trim().isEmpty()) return;
            runOnUiThread(() -> {
                textToSpeech.stop();
                textToSpeech.speak(text, TextToSpeech.QUEUE_FLUSH, null, "hanja-speech");
            });
        }
    }

    private class HanjaNativeAuth {
        @JavascriptInterface
        public void chooseGoogleAccount() {
            runOnUiThread(() -> {
                GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                    .requestEmail()
                    .requestIdToken(getString(R.string.default_web_client_id))
                    .build();
                GoogleSignInClient client = GoogleSignIn.getClient(MainActivity.this, gso);
                startActivityForResult(client.getSignInIntent(), REQUEST_CODE_GOOGLE_SIGN_IN);
            });
        }
    }
}
