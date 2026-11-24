package br.com.wordquest.game;

import android.os.Bundle;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.FirebaseApp;
import com.google.firebase.analytics.FirebaseAnalytics;
import com.google.firebase.crashlytics.FirebaseCrashlytics;
import java.util.Iterator;

/**
 * Medição de uso e relatório de falhas do jogo. O jogo é uma página dentro do app, então os eventos
 * (fase iniciada, duelo terminado…) e os erros de JavaScript chegam por aqui ao Firebase Analytics
 * e ao Crashlytics. Sem o google-services.json no build, o Firebase não existe e tudo vira no-op.
 */
@CapacitorPlugin(name = "Telemetry")
public class TelemetryPlugin extends Plugin {
  /** O Firebase só existe quando o build foi feito com o arquivo de configuração. */
  private boolean ready() {
    return !FirebaseApp.getApps(getContext()).isEmpty();
  }

  @PluginMethod
  public void logEvent(PluginCall call) {
    String name = call.getString("name");
    if (name == null || !ready()) {
      call.resolve();
      return;
    }
    Bundle bundle = new Bundle();
    JSObject params = call.getObject("params", new JSObject());
    for (Iterator<String> it = params.keys(); it.hasNext(); ) {
      String key = it.next();
      Object value = params.opt(key);
      if (value instanceof Integer || value instanceof Long) {
        bundle.putLong(key, ((Number) value).longValue());
      } else if (value instanceof Number) {
        bundle.putDouble(key, ((Number) value).doubleValue());
      } else if (value instanceof Boolean) {
        bundle.putLong(key, ((Boolean) value) ? 1 : 0);
      } else if (value != null) {
        bundle.putString(key, String.valueOf(value));
      }
    }
    FirebaseAnalytics.getInstance(getContext()).logEvent(name, bundle);
    call.resolve();
  }

  /** Erro de JavaScript que o jogo capturou: vai ao Crashlytics como falha não fatal. */
  @PluginMethod
  public void recordError(PluginCall call) {
    if (!ready()) {
      call.resolve();
      return;
    }
    String message = call.getString("message", "Erro de JavaScript");
    String stack = call.getString("stack", "");
    FirebaseCrashlytics crashlytics = FirebaseCrashlytics.getInstance();
    if (stack != null && !stack.isEmpty()) crashlytics.log(stack);
    crashlytics.recordException(new RuntimeException(message));
    call.resolve();
  }

  /** Propriedade de usuário (ex.: lang = pt/en), para segmentar os relatórios por público. */
  @PluginMethod
  public void setUserProperty(PluginCall call) {
    String name = call.getString("name");
    String value = call.getString("value");
    if (name != null && ready())
      FirebaseAnalytics.getInstance(getContext()).setUserProperty(name, value);
    call.resolve();
  }

  /** Anotação de contexto (tela atual, por exemplo) que acompanha o próximo relatório de falha. */
  @PluginMethod
  public void setContext(PluginCall call) {
    String key = call.getString("key");
    String value = call.getString("value", "");
    if (key != null && ready()) FirebaseCrashlytics.getInstance().setCustomKey(key, value);
    call.resolve();
  }
}
