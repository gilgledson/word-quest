package br.com.wordquest.game;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.appcheck.FirebaseAppCheck;

/**
 * Firebase App Check para o jogo (src/services/appCheck.ts). O duelo ao vivo roda no SDK web do
 * Firebase, dentro do WebView, que não fala com o Play Integrity; por isso o token é gerado aqui e
 * entregue ao JavaScript, que o usa num CustomProvider.
 */
@CapacitorPlugin(name = "AppCheck")
public class AppCheckPlugin extends Plugin {
  @Override
  public void load() {
    FirebaseAppCheck.getInstance().installAppCheckProviderFactory(AppCheckProvider.factory());
  }

  @PluginMethod
  public void getToken(PluginCall call) {
    FirebaseAppCheck.getInstance()
      .getAppCheckToken(false)
      .addOnSuccessListener(result -> {
        JSObject ret = new JSObject();
        ret.put("token", result.getToken());
        ret.put("expireTimeMillis", result.getExpireTimeMillis());
        call.resolve(ret);
      })
      .addOnFailureListener(e -> call.reject(e.getMessage() == null ? "App Check falhou" : e.getMessage()));
  }
}
