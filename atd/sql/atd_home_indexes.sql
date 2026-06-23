-- Indices recomendados para otimizar a tela atd/home.php.
-- Nao execute sem antes conferir os indices existentes em producao:
-- SHOW INDEX FROM atendimentos;
-- SHOW INDEX FROM espera;
-- SHOW INDEX FROM interatividade;
-- SHOW INDEX FROM clientes;
-- SHOW INDEX FROM pessoas;
-- SHOW INDEX FROM usuarios;

ALTER TABLE atendimentos
  ADD INDEX idx_atd_home_status_abertura (`status`, abertura),
  ADD INDEX idx_atd_home_status_tipo (`status`, tipo),
  ADD INDEX idx_atd_home_cliente_status (cliente, `status`),
  ADD INDEX idx_atd_home_tecnico_status (tecnico, `status`),
  ADD INDEX idx_atd_home_tipo_status (tipo, `status`),
  ADD INDEX idx_atd_home_pessoa (pessoa),
  ADD INDEX idx_atd_home_recorrencia (recorrente, data_recorrencia, vezes);

ALTER TABLE espera
  ADD INDEX idx_espera_home_atd_id (espera_atd, espera_id),
  ADD INDEX idx_espera_home_atd_prev (espera_atd, espera_prev);

ALTER TABLE interatividade
  ADD INDEX idx_inter_home_atd_tipo_data (inter_atd, inter_tipo, inter_data);

ALTER TABLE clientes
  ADD INDEX idx_clientes_home_status_nome (clt_sts, clt_nomef);

ALTER TABLE pessoas
  ADD INDEX idx_pessoas_home_cliente_nome (pessoa_clt, pessoa_nom);

ALTER TABLE usuarios
  ADD INDEX idx_usuarios_home_filtro (user_sts, user_funcao, user_id, user_nome);
