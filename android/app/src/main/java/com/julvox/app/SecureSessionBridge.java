package com.julvox.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.webkit.JavascriptInterface;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyStore;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

final class SecureSessionBridge {
    private static final String KEYSTORE_PROVIDER = "AndroidKeyStore";
    private static final String KEY_ALIAS = "julvox.session.aes.v1";
    private static final String CIPHER = "AES/GCM/NoPadding";
    private static final String PREFS = "julvox_secure_session";
    private static final String PREF_CIPHERTEXT = "ciphertext";
    private static final String PREF_IV = "iv";
    private static final int MAX_SESSION_BYTES = 64 * 1024;

    private final SharedPreferences preferences;

    SecureSessionBridge(Context context) {
        preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    @JavascriptInterface
    public synchronized void storeSession(String sessionJson) {
        if (sessionJson == null || sessionJson.isBlank()) {
            clearSession();
            return;
        }
        byte[] plaintext = sessionJson.getBytes(StandardCharsets.UTF_8);
        if (plaintext.length > MAX_SESSION_BYTES) {
            clearSession();
            return;
        }
        try {
            Cipher cipher = Cipher.getInstance(CIPHER);
            cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey());
            byte[] encrypted = cipher.doFinal(plaintext);
            preferences.edit()
                .putString(PREF_CIPHERTEXT, Base64.encodeToString(encrypted, Base64.NO_WRAP))
                .putString(PREF_IV, Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP))
                .commit();
        } catch (GeneralSecurityException error) {
            clearSession();
        }
    }

    @JavascriptInterface
    public synchronized String getSession() {
        String ciphertext = preferences.getString(PREF_CIPHERTEXT, null);
        String iv = preferences.getString(PREF_IV, null);
        if (ciphertext == null || iv == null) return "";
        try {
            Cipher cipher = Cipher.getInstance(CIPHER);
            cipher.init(
                Cipher.DECRYPT_MODE,
                getOrCreateKey(),
                new GCMParameterSpec(128, Base64.decode(iv, Base64.NO_WRAP))
            );
            byte[] plaintext = cipher.doFinal(Base64.decode(ciphertext, Base64.NO_WRAP));
            return new String(plaintext, StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException error) {
            clearSession();
            return "";
        }
    }

    @JavascriptInterface
    public synchronized void clearSession() {
        preferences.edit().clear().commit();
    }

    private SecretKey getOrCreateKey() throws GeneralSecurityException {
        KeyStore keyStore = KeyStore.getInstance(KEYSTORE_PROVIDER);
        try {
            keyStore.load(null);
        } catch (java.io.IOException error) {
            throw new GeneralSecurityException("Unable to load Android Keystore", error);
        } catch (java.security.cert.CertificateException error) {
            throw new GeneralSecurityException("Unable to load Android Keystore", error);
        }
        java.security.Key existing = keyStore.getKey(KEY_ALIAS, null);
        if (existing instanceof SecretKey) return (SecretKey) existing;

        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE_PROVIDER);
        generator.init(new KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setRandomizedEncryptionRequired(true)
            .build());
        return generator.generateKey();
    }
}
