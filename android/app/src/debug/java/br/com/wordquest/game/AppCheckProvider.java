package br.com.wordquest.game;

import com.google.firebase.appcheck.AppCheckProviderFactory;
import com.google.firebase.appcheck.debug.DebugAppCheckProviderFactory;

/**
 * Build de teste (.teste): provedor de depuração. Na primeira abertura o token aparece no Logcat
 * ("DebugAppCheckProvider"); cadastre-o uma vez no console do Firebase (App Check > Apps > menu do
 * app > Gerenciar tokens de depuração).
 */
final class AppCheckProvider {
  private AppCheckProvider() {}

  static AppCheckProviderFactory factory() {
    return DebugAppCheckProviderFactory.getInstance();
  }
}
