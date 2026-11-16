package br.com.wordquest.game;

import android.app.Application;
import com.google.android.gms.games.PlayGamesSdk;

public class WordQuestApp extends Application {

  @Override
  public void onCreate() {
    super.onCreate();
    // O Play Games exige a inicialização aqui, antes de qualquer tela. Sem o id do projeto
    // (res/values/strings.xml) o jogo abre normalmente, só sem login, conquistas e placar da Google.
    if (PlayGamesPlugin.configured(this)) PlayGamesSdk.initialize(this);
  }
}
