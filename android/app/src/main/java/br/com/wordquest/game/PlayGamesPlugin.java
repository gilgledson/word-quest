package br.com.wordquest.game;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.common.images.ImageManager;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.SnapshotsClient;
import com.google.android.gms.games.snapshot.Snapshot;
import com.google.android.gms.games.snapshot.SnapshotMetadataChange;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Ponte com os Serviços do Google Play Games (v2): login, conquistas e placar. O jogo continua
 * funcionando sem eles: enquanto `game_services_project_id` estiver vazio, `status` responde
 * "não configurado" e nada mais é chamado.
 */
@CapacitorPlugin(name = "PlayGames")
public class PlayGamesPlugin extends Plugin {

  /** O id do projeto do Play Games foi preenchido em res/values/strings.xml? */
  static boolean configured(Context context) {
    return !context.getString(R.string.game_services_project_id).trim().isEmpty();
  }

  private boolean ready(PluginCall call) {
    if (configured(getContext())) return true;
    call.reject("Play Games não configurado");
    return false;
  }

  /** Lado, em pixels, da foto do jogador entregue ao jogo. */
  private static final int PHOTO_SIZE = 128;

  /** Responde a situação do login; conectado, vai junto o nome e a foto do perfil do Play Games. */
  private void authenticated(PluginCall call, boolean signedIn) {
    JSObject out = new JSObject();
    out.put("configured", true);
    out.put("signedIn", signedIn);
    if (!signedIn) {
      call.resolve(out);
      return;
    }
    PlayGames.getPlayersClient(getActivity())
      .getCurrentPlayer()
      .addOnCompleteListener((task) -> {
        if (!task.isSuccessful() || task.getResult() == null) {
          call.resolve(out);
          return;
        }
        out.put("name", task.getResult().getDisplayName());
        Uri icon = task.getResult().getIconImageUri();
        if (icon == null) {
          call.resolve(out);
          return;
        }
        // A foto só é acessível pelo gerenciador de imagens do Google: vai ao jogo como imagem embutida.
        ImageManager.create(getContext()).loadImage(
          (uri, drawable, requested) -> {
            String photo = encode(drawable);
            if (photo != null) out.put("photo", photo);
            call.resolve(out);
          },
          icon
        );
      });
  }

  private static String encode(Drawable drawable) {
    if (drawable == null) return null;
    try {
      Bitmap bitmap = Bitmap.createBitmap(PHOTO_SIZE, PHOTO_SIZE, Bitmap.Config.ARGB_8888);
      drawable.setBounds(0, 0, PHOTO_SIZE, PHOTO_SIZE);
      drawable.draw(new Canvas(bitmap));
      ByteArrayOutputStream bytes = new ByteArrayOutputStream();
      bitmap.compress(Bitmap.CompressFormat.PNG, 100, bytes);
      return "data:image/png;base64," + Base64.encodeToString(bytes.toByteArray(), Base64.NO_WRAP);
    } catch (Exception e) {
      return null;
    }
  }

  /** Situação atual: configurado e com o jogador conectado (o login automático roda na abertura). */
  @PluginMethod
  public void status(PluginCall call) {
    if (!configured(getContext())) {
      JSObject out = new JSObject();
      out.put("configured", false);
      out.put("signedIn", false);
      call.resolve(out);
      return;
    }
    PlayGames.getGamesSignInClient(getActivity())
      .isAuthenticated()
      .addOnCompleteListener((task) -> authenticated(call, task.isSuccessful() && task.getResult().isAuthenticated()));
  }

  /** Login pedido pelo jogador (botão "Entrar"). */
  @PluginMethod
  public void signIn(PluginCall call) {
    if (!ready(call)) return;
    PlayGames.getGamesSignInClient(getActivity())
      .signIn()
      .addOnCompleteListener((task) -> authenticated(call, task.isSuccessful() && task.getResult().isAuthenticated()));
  }

  /** Desbloqueia conquistas pelos ids do Play Console. Repetir uma já desbloqueada não faz nada. */
  @PluginMethod
  public void unlock(PluginCall call) {
    if (!ready(call)) return;
    JSArray ids = call.getArray("ids", new JSArray());
    try {
      for (String id : ids.<String>toList()) {
        if (id != null && !id.isEmpty()) PlayGames.getAchievementsClient(getActivity()).unlock(id);
      }
      call.resolve();
    } catch (Exception e) {
      call.reject("Lista de conquistas inválida", e);
    }
  }

  /** Envia a pontuação ao placar; o Play Games só guarda a melhor. */
  @PluginMethod
  public void submitScore(PluginCall call) {
    if (!ready(call)) return;
    String leaderboard = call.getString("leaderboard", "");
    Integer score = call.getInt("score");
    if (leaderboard.isEmpty() || score == null) {
      call.reject("Placar ou pontuação ausente");
      return;
    }
    PlayGames.getLeaderboardsClient(getActivity()).submitScore(leaderboard, score);
    call.resolve();
  }

  /** Abre a tela de conquistas do Play Games. */
  @PluginMethod
  public void showAchievements(PluginCall call) {
    if (!ready(call)) return;
    PlayGames.getAchievementsClient(getActivity())
      .getAchievementsIntent()
      .addOnSuccessListener((intent) -> startActivityForResult(call, intent, "closed"))
      .addOnFailureListener((e) -> call.reject("Não foi possível abrir as conquistas", e));
  }

  /** Abre a tela do placar do Play Games. */
  @PluginMethod
  public void showLeaderboard(PluginCall call) {
    if (!ready(call)) return;
    String leaderboard = call.getString("leaderboard", "");
    if (leaderboard.isEmpty()) {
      call.reject("Placar ausente");
      return;
    }
    PlayGames.getLeaderboardsClient(getActivity())
      .getLeaderboardIntent(leaderboard)
      .addOnSuccessListener((intent) -> startActivityForResult(call, intent, "closed"))
      .addOnFailureListener((e) -> call.reject("Não foi possível abrir o placar", e));
  }

  /** Nome do único jogo salvo: o progresso inteiro do jogador. */
  private static final String SAVE_NAME = "progresso";

  /** Abre o jogo salvo (criando se não existir) e entrega ao bloco; conflito fica com o mais recente. */
  private void openSave(PluginCall call, java.util.function.Consumer<Snapshot> then) {
    PlayGames.getSnapshotsClient(getActivity())
      .open(SAVE_NAME, true, SnapshotsClient.RESOLUTION_POLICY_MOST_RECENTLY_MODIFIED)
      .addOnCompleteListener((task) -> {
        if (!task.isSuccessful() || task.getResult() == null || task.getResult().isConflict() || task.getResult().getData() == null) {
          call.reject("Não foi possível abrir o jogo salvo", task.getException());
          return;
        }
        then.accept(task.getResult().getData());
      });
  }

  /** Lê o progresso salvo na conta. `data` vem vazio quando ainda não há nada salvo. */
  @PluginMethod
  public void loadSave(PluginCall call) {
    if (!ready(call)) return;
    openSave(call, (snapshot) -> {
      try {
        byte[] bytes = snapshot.getSnapshotContents().readFully();
        PlayGames.getSnapshotsClient(getActivity()).discardAndClose(snapshot);
        JSObject out = new JSObject();
        out.put("data", bytes == null ? "" : new String(bytes, StandardCharsets.UTF_8));
        call.resolve(out);
      } catch (Exception e) {
        call.reject("Não foi possível ler o jogo salvo", e);
      }
    });
  }

  /** Grava o progresso na conta do jogador. */
  @PluginMethod
  public void writeSave(PluginCall call) {
    if (!ready(call)) return;
    String data = call.getString("data", "");
    String description = call.getString("description", "WordQuest");
    if (data.isEmpty()) {
      call.reject("Progresso vazio");
      return;
    }
    openSave(call, (snapshot) -> {
      snapshot.getSnapshotContents().writeBytes(data.getBytes(StandardCharsets.UTF_8));
      SnapshotMetadataChange change = new SnapshotMetadataChange.Builder().setDescription(description).build();
      PlayGames.getSnapshotsClient(getActivity())
        .commitAndClose(snapshot, change)
        .addOnSuccessListener((meta) -> call.resolve())
        .addOnFailureListener((e) -> call.reject("Não foi possível gravar o jogo salvo", e));
    });
  }

  @ActivityCallback
  private void closed(PluginCall call, ActivityResult result) {
    if (call != null) call.resolve();
  }
}
