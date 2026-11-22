/**
 * Projeto do Firebase usado pelo duelo ao vivo (Console do Firebase > Configurações do projeto >
 * Seus apps > app da Web). Estes valores identificam o projeto e são públicos por natureza: quem
 * protege os dados são as regras do banco, não o segredo deles. Com `apiKey` vazio o modo online
 * fica desligado.
 */
export const firebaseConfig = {
  apiKey: "AIzaSyC6ijXmxPc9XkJtEyEzMJuOguTRw7L04Aw",
  authDomain: "wordquest-online.firebaseapp.com",
  databaseURL: "https://wordquest-online-default-rtdb.firebaseio.com",
  projectId: "wordquest-online",
  // Analytics da versão web (jogar.wordquest.com.br): mesma propriedade do app Android.
  measurementId: "G-ZYZ48LXV3C",
  appId: "1:896431008098:web:6258966b3e71359a8d243b",
  /**
   * Chave do site do reCAPTCHA Enterprise (App Check da versão web). Também é pública. Vazia: a
   * versão web segue sem App Check (ver `src/services/appCheck.ts`).
   */
  recaptchaSiteKey: "",
};
export const onlineConfigured = firebaseConfig.apiKey !== "";
