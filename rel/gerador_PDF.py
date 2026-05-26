# -*- coding: utf-8 -*-
import sys
import base64
import os
from datetime import datetime
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.wait import WebDriverWait
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from unidecode import unidecode


# MUDANÇA 2: Função de salvamento com diagnóstico detalhado
def salvar_pdf(driver, pasta_destino, nome_arquivo):
    """Salva a página atual como PDF com múltiplos passos de verificação."""
    print("\n--- Iniciando processo de salvamento ---")

    if not os.path.exists(pasta_destino):
        print(
            f"AVISO: A pasta de destino '{pasta_destino}' não existe. Tentando criar...")
        os.makedirs(pasta_destino, exist_ok=True)

    if not os.access(pasta_destino, os.W_OK):
        print(
            f"ERRO CRÍTICO: O script não tem permissão de ESCRITA na pasta '{pasta_destino}'.")
        print("SOLUÇÃO: Execute 'sudo chown -R www-data:www-data relatorios' e 'sudo chmod -R 775 relatorios' no terminal do servidor.")
        return

    caminho_absoluto = os.path.abspath(
        os.path.join(pasta_destino, nome_arquivo))
    print(f"Tentando salvar em: {caminho_absoluto}")

    pdf_data = driver.execute_cdp_cmd(
        "Page.printToPDF",
        {"landscape": False, "displayHeaderFooter": False,
            "printBackground": True, "preferCSSPageSize": True}
    )

    tamanho_dados = len(pdf_data.get('data', ''))
    print(f"Dados do PDF recebidos. Tamanho: {tamanho_dados} bytes.")
    if tamanho_dados == 0:
        print("ERRO: O Chrome retornou dados de PDF vazios. A página pode não ter renderizado corretamente.")
        return

    try:
        with open(caminho_absoluto, "wb") as f:
            f.write(base64.b64decode(pdf_data['data']))
        print("Arquivo escrito no disco com sucesso.")

        if os.path.exists(caminho_absoluto):
            print(
                f"VERIFICAÇÃO OK: O arquivo '{nome_arquivo}' foi encontrado na pasta após a criação.")
        else:
            print(
                f"ERRO INESPERADO: O arquivo não foi encontrado após a tentativa de escrita.")

    except Exception as e:
        print(f"ERRO DURANTE A ESCRITA DO ARQUIVO: {e}")

    print("--- Fim do processo de salvamento ---")


def main():
    # MUDANÇA: Agora espera 4 argumentos
    if len(sys.argv) < 5:
        print(
            "Erro: Faltam parâmetros. Uso: gerarRelatorio.py <ids_clientes> <nomes_clientes> <data_inicio> <data_fim>"
        )
        sys.exit(1)

    # MUDANÇA: Recebe as strings de IDs e Nomes
    cliente_ids_str = sys.argv[1]
    cliente_nomes_str = sys.argv[2]
    data_inicio_str = sys.argv[3]
    data_fim_str = sys.argv[4]

    # MUDANÇA: Transforma as strings em listas
    cliente_id_list = cliente_ids_str.split(',')
    cliente_nome_list = cliente_nomes_str.split(':::')

    # MUDANÇA: Combina as duas listas em uma lista de tuplas (id, nome)
    clientes_para_processar = list(zip(cliente_id_list, cliente_nome_list))

    pasta_destino = os.path.join(os.path.dirname(__file__), 'relatorios')

    print(f"Iniciando geração de {len(clientes_para_processar)} relatórios...")

    options = webdriver.ChromeOptions()
    # options.add_argument("--headless")
    # options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--window-size=1920,1080")

    driver = None
    try:
        driver = webdriver.Chrome(service=Service(
            ChromeDriverManager().install()), options=options)

        print("Realizando login...")
        # driver.get('https://allterus.nivel3ti.com.br/n3ti/')
        driver.get('http://localhost/n3ti/index.php')
        WebDriverWait(driver, 10).until(
            EC.visibility_of_element_located((By.NAME, "usuario")))
        driver.find_element(By.NAME, "usuario").send_keys("allterus")
        driver.find_element(By.NAME, "senha").send_keys("Teste!123456")
        driver.find_element(By.NAME, "senha").send_keys(Keys.RETURN)
        time.sleep(2)

        total_clientes = len(clientes_para_processar)
        for i, (cliente_id, nome_cliente) in enumerate(clientes_para_processar):

            print(
                f"\nProcessando cliente {i + 1}/{total_clientes}: {nome_cliente}")

            try:
                driver.get('http://localhost/n3ti/rel/rel_Unificado_Id.php')
                WebDriverWait(driver, 10).until(
                    EC.visibility_of_element_located((By.ID, "f_clt")))

                # select_cliente=Select(driver.find_element(By.ID,"f_clt"))
                # select_cliente.select_by_visible_text(nome_cliente)

                # Encontra o elemento
                campo_cliente_id = driver.find_element(By.NAME, "f_clt")

                # --- INÍCIO DAS NOVAS LINHAS DE DEPURAÇÃO ---

                # 2. Destaque Visual: Pinta a borda do elemento de vermelho por 2 segundos
                print("Elemento 'f_clt' encontrado. Destacando em vermelho...")
                driver.execute_script(
                    "arguments[0].style.border='3px solid red'", campo_cliente_id)
                time.sleep(2)  # Pausa para você ver o destaque

                # --- FIM DAS NOVAS LINHAS DE DEPURAÇÃO ---

                # 3. Interação: Limpa o campo e digita o ID
                print(f"Digitando o ID: {cliente_id}")
                campo_cliente_id.clear()
                campo_cliente_id.send_keys(cliente_id)

                # Pausa extra para ver o texto digitado
                time.sleep(1)

                data_inicio_fmt=datetime.strptime(data_inicio_str,'%Y-%m-%d').strftime('%d/%m/%Y')
                data_fim_fmt=datetime.strptime(data_fim_str,'%Y-%m-%d').strftime('%d/%m/%Y')

                driver.find_element(By.ID,"data_1").send_keys(data_inicio_fmt)
                driver.find_element(By.ID,"data_2").send_keys(data_fim_fmt)
                driver.find_element(By.XPATH,"//button[text()='Filtrar']").click()
                time.sleep(5)

                data_inicio_para_titulo = datetime.strptime(data_inicio_str, '%Y-%m-%d').strftime('%d-%m-%Y')
                data_fim_para_titulo = datetime.strptime(data_fim_str, '%Y-%m-%d').strftime('%d-%m-%Y')

                nome_cliente_formatado = unidecode(nome_cliente).replace(" ", "_")

                nome_arquivo = f"Relatorio_{nome_cliente_formatado}_{data_inicio_para_titulo}_a_{data_fim_para_titulo}.pdf"

                salvar_pdf(driver, pasta_destino, nome_arquivo)

            except Exception as e:
                print(f"ERRO ao processar o cliente '{nome_cliente}': {e}")
                continue

    except Exception as e:
        print(f"Ocorreu um erro geral na automação: {e}")
    finally:
        if driver:
            driver.quit()
        print("\nProcesso finalizado.")


if __name__ == "__main__":
    main()
