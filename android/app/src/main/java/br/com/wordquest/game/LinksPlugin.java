package br.com.wordquest.game;

import android.content.Intent;
import android.net.Uri;
import com.android.installreferrer.api.InstallReferrerClient;
import com.android.installreferrer.api.InstallReferrerStateListener;
import com.android.installreferrer.api.ReferrerDetails;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Links do jogo (https://wordquest.com.br/c/CODIGO).
 *
 * - {@code launchUrl}: o link que abriu o app agora (ou nada, se ele abriu pelo ícone).
 * - evento {@code link}: um link tocado com o app já aberto (a activity é singleTask).
 * - {@code installReferrer}: o que a Play Store guardou do link de instalação (o convite manda
 *   {@code sala=CODIGO}), para o app recém-instalado entrar na sala do amigo. Não envia nada a
 *   ninguém: só lê o texto que veio no próprio link da loja.
 */
@CapacitorPlugin(name = "Links")
public class LinksPlugin extends Plugin {
  private String launch;

  @Override
  public void load() {
    launch = linkOf(getActivity().getIntent());
  }

  @Override
  protected void handleOnNewIntent(Intent intent) {
    super.handleOnNewIntent(intent);
    String url = linkOf(intent);
    if (url == null) return;
    JSObject data = new JSObject();
    data.put("url", url);
    notifyListeners("link", data, true);
  }

  private static String linkOf(Intent intent) {
    if (intent == null || !Intent.ACTION_VIEW.equals(intent.getAction())) return null;
    Uri data = intent.getData();
    return data == null ? null : data.toString();
  }

  @PluginMethod
  public void launchUrl(PluginCall call) {
    JSObject result = new JSObject();
    if (launch != null) result.put("url", launch);
    // Vale uma vez: recarregar o WebView não repete a navegação.
    launch = null;
    call.resolve(result);
  }

  @PluginMethod
  public void installReferrer(PluginCall call) {
    InstallReferrerClient client;
    try {
      client = InstallReferrerClient.newBuilder(getContext()).build();
    } catch (Exception e) {
      call.resolve(new JSObject());
      return;
    }
    final InstallReferrerClient referrer = client;
    try {
      referrer.startConnection(
        new InstallReferrerStateListener() {
          private boolean done;

          @Override
          public void onInstallReferrerSetupFinished(int code) {
            if (done) return;
            done = true;
            JSObject result = new JSObject();
            try {
              if (code == InstallReferrerClient.InstallReferrerResponse.OK) {
                ReferrerDetails details = referrer.getInstallReferrer();
                result.put("referrer", details.getInstallReferrer());
                result.put("installedAt", details.getInstallBeginTimestampSeconds());
              }
            } catch (Exception ignored) {
              // Sem referrer (loja antiga, instalação fora da Play): segue sem ele.
            } finally {
              referrer.endConnection();
            }
            call.resolve(result);
          }

          @Override
          public void onInstallReferrerServiceDisconnected() {
            if (done) return;
            done = true;
            call.resolve(new JSObject());
          }
        }
      );
    } catch (Exception e) {
      call.resolve(new JSObject());
    }
  }
}
