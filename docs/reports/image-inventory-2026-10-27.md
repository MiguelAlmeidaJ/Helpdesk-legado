# Levantamento de imagens — 27/10/2026

Banco consultado: **nivel3_hml**, entre **15:28 e 15:29**, horário de São Paulo. Consultas somente de leitura; nenhum dado ou arquivo do sistema foi alterado.

## Quantidade e tamanho encontrados

| Local | Imagens | Bytes armazenados | MiB |
| --- | ---: | ---: | ---: |
| Banco: chamados — imagens.img_atd | 398 | 52.117.103 | 49,70 |
| Banco: tarefas — imagens_tarefa.img_tarefa | 208 | 29.358.408 | 28,00 |
| Banco: Base64 em running_balance.remarks | 39 | 5.048.564 | 4,81 |
| Banco: Base64 em catalogos.conteudo | 23 | 1.495.763 | 1,43 |
| **Subtotal no banco** | **668** | **88.019.838** | **83,94** |
| Arquivos: storage/uploads/catalog | 655 | 120.026.749 | 114,47 |
| **Total de imagens de conteúdo localizadas** | **1.323** | **208.046.587** | **198,41** |
| Arquivos gráficos da interface: logos e favicons | 6 | 639.335 | 0,61 |
| **Total local, incluindo interface** | **1.329** | **208.685.922** | **199,02** |

Os bytes Base64 medem a representação armazenada no texto, incluindo o prefixo data:image, sem o HTML ao redor. As 62 imagens Base64 têm **3.013.952 bytes (2,87 MiB)** quando decodificadas, mas ocupam **6.544.327 bytes (6,24 MiB)** como texto. Parte está em NVARCHAR, que utiliza dois bytes por caractere nesses conteúdos.

O conteúdo de imagem decodificado, somado aos binários e arquivos, corresponde a **204.516.212 bytes (195,04 MiB)**. Pela comparação SHA-256, há **1.230 conteúdos únicos**, com **188.340.623 bytes (179,62 MiB)**, e **93 cópias de conteúdo repetido**. Não foi encontrada imagem com conteúdo idêntico simultaneamente no banco e nos arquivos. Essas métricas de deduplicação excluem os gráficos da interface.

## Referências sem conteúdo local disponível

- **documentos:** 2.165 referências distintas a imagens, sem arquivo encontrado nos diretórios usados pela aplicação. Não são arquivos binários dentro dessa tabela; são caminhos e metadados. O tamanho não pôde ser medido.
- **catalog_images:** 656 registros, dos quais 655 têm arquivo presente. O registro **id=2** está sem arquivo; seus metadados declaram 14.084 bytes. Esse valor declarado não foi somado ao armazenamento real.
- **Catálogos:** 314 ocorrências de links HTTP a imagens, correspondentes a **237 destinos distintos**: 313 ocorrências em lh7-rt.googleusercontent.com e uma em centraldeatendimento.totvs.com. Esses destinos não foram acessados; existência, tamanho e eventual sobreposição com outras imagens não foram verificados.
- Os catálogos também têm 661 ocorrências de referências a imagens da aplicação e uma referência local adicional em ../uploads/2026_03_69ba80c916d8b_1773830345.png, cujo diretório legado está ausente. Essas ocorrências de HTML não foram adicionadas ao total de arquivos, evitando contar cada uso de uma mesma imagem como um novo arquivo. Referências de fontes diferentes podem apontar ao mesmo conteúdo ausente.

As referências ausentes ou remotas impedem afirmar o tamanho integral de todas as imagens históricas do sistema. Não devem ser somadas ao total de conteúdo localizado sem recuperação e conferência dos arquivos.

## Integridade e classificação

Os 655 arquivos presentes de catálogo foram conferidos contra tamanho e SHA-256 registrados no banco: **nenhuma divergência** e **nenhum arquivo de catálogo sem metadados**.

As tabelas imagens e imagens_tarefa têm 614 registros binários não vazios, mas somente 606 são imagens identificadas pela assinatura do arquivo. Os oito anexos restantes somam **7.355.857 bytes (7,02 MiB)** e foram excluídos do total de imagens:

- Chamados: três contêineres MP4 e dois PDFs.
- Tarefas: um PDF, um HTML e um arquivo ZIP/Office.

Os 172 anexos JSON identificados em running_balance.anexos estão classificados por seus metadados como outros tipos de arquivo; não foram contados como imagens. Não foram encontradas referências de imagens em cads_fotos ou troca_devolucao_anexos.

## Abrangência e reprodução

Foram verificadas as duas colunas binárias do banco, **281 colunas textuais em 100 tabelas**, os diretórios configurados de upload, os diretórios legados de fallback e os arquivos públicos da interface. A pasta de anexos de chamados está vazia; as pastas de RD e de uploads legados não existem neste checkout. Nenhuma falha de leitura ocorreu nas áreas varridas.

O levantamento cobre o banco de homologação conectado e os caminhos locais desta instalação. Exclui outras bases/servidores, arquivos remotos, imagens internas de PDFs/Office, backups, dependências e cópias geradas por build. A detecção de Base64 procura data:image; não procura sequências Base64 sem identificação de imagem. As medidas são de conteúdo lógico, sem índices, páginas SQL Server ou unidades de alocação do disco. A coleta não utilizou um snapshot transacional: mudanças concorrentes podem alterar os números após o levantamento.

Reproduzir na raiz do projeto: `node scripts/inventory-images.cjs`. O script faz apenas SELECT e leitura de arquivos do sistema; sua única escrita é o relatório JSON agregado em docs/reports.

Detalhes: [JSON do levantamento](image-inventory-2026-10-27.json).
