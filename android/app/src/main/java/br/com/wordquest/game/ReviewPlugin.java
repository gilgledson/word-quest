package br.com.wordquest.game;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.core.review.ReviewInfo;
import com.google.android.play.core.review.ReviewManager;
import com.google.android.play.core.review.ReviewManagerFactory;

/**
 * Avaliação dentro do app (Google Play In-App Review). O Google decide se a janela aparece (há uma
 * cota por pessoa) e nunca diz se a pessoa avaliou; por isso a chamada sempre termina sem erro.
 */
@CapacitorPlugin(name = "Review")
public class ReviewPlugin extends Plugin {
  @PluginMethod
  public void requestReview(PluginCall call) {
    try {
      ReviewManager manager = ReviewManagerFactory.create(getContext());
      manager
        .requestReviewFlow()
        .addOnCompleteListener(task -> {
          if (!task.isSuccessful() || getActivity() == null) {
            call.resolve();
            return;
          }
          ReviewInfo info = task.getResult();
          manager.launchReviewFlow(getActivity(), info).addOnCompleteListener(done -> call.resolve());
        });
    } catch (Exception e) {
      call.resolve();
    }
  }
}
