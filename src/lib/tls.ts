/*
  Verificacion del certificado del servidor de correo.

  Por defecto se exige un certificado valido. `MAIL_TLS_INSECURE=true` la
  desactiva, y solo tiene sentido cuando el webmail habla con el servidor de
  correo por la red interna de Docker: ahi no hay un tercero que pueda
  interponerse y el certificado suele ser autofirmado.

  Nunca la actives para un servidor alcanzable por internet. Sin verificacion,
  cualquiera que se interponga en el camino puede quedarse con la contrasena.
*/
export function verificarCertificadoTls(): boolean {
  return process.env.MAIL_TLS_INSECURE !== "true";
}
