package br.com.wordquest.game;

import com.google.firebase.appcheck.AppCheckProviderFactory;
import com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory;

/** Versão da loja: o Google Play confirma que o app é o original, instalado pela loja. */
final class AppCheckProvider {
  private AppCheckProvider() {}

  static AppCheckProviderFactory factory() {
    return PlayIntegrityAppCheckProviderFactory.getInstance();
  }
}
