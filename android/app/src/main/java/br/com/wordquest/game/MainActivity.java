package br.com.wordquest.game;

import android.os.Bundle;
import android.view.WindowManager;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(PlayGamesPlugin.class);
    registerPlugin(TelemetryPlugin.class);
    super.onCreate(savedInstanceState);
    // Tela de ponta a ponta também nos Android anteriores ao 15 (no 15+ já é obrigatório). Fica depois
    // do super: antes dele a janela nasce com o tema de abertura (barra de título e fundo da splash).
    // As áreas das barras do sistema chegam ao jogo pelo SystemBars do Capacitor.
    EdgeToEdge.enable(this);
    // A tela fica acesa enquanto o app está em primeiro plano; ao sair, volta ao normal.
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
  }
}
