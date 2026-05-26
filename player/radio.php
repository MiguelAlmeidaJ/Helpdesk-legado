<?php
session_start();
include_once("../all/seguranca.php");
include_once("../all/conect.php");
include_once("../all/permissoes.php");

?>
<!DOCTYPE html>
<html lang="pt-br">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link rel="icon" href="../img/favicon.ico">
    <link rel="stylesheet" href="../css/help.css">
    <link rel="stylesheet" href="../css/bootstrap.min.css">
    <link rel="stylesheet" href="../fontawesome/css/all.css">
    <link rel="stylesheet" href="../css/bootstrap-select.min.css">
    <link rel="stylesheet" href="../css/bootstrap-datetimepicker.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">

    <title>Rádios Online</title>

    <style>
        :root {
            --bg-color: #f0f2f5;
            --card-bg-color: #ffffff;
            --text-color: #1c1e21;
            --secondary-text-color: #333;
            --border-color: #ddd;
            --item-bg-color: #f7f7f7;
            --item-hover-bg-color: #e9ecef;
            --primary-color: #0056b3;
            --highlight-color: #007bff;
            --shadow-color: rgba(0, 0, 0, 0.1);
        }

        /* Estilos do Tema Escuro */
        body.dark-mode {
            --bg-color: #18191a;
            --card-bg-color: #242526;
            --text-color: #e4e6eb;
            --secondary-text-color: #e4e6eb;
            --border-color: #4d4d4d;
            --item-bg-color: #3a3b3c;
            --item-hover-bg-color: #525354;
            --primary-color: #4b9cff;
            --highlight-color: #4b9cff;
            --shadow-color: rgba(0, 0, 0, 0.4);
        }

        body {
            zoom: 0.9;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            margin: 0;
            transition: background-color 0.3s, color 0.3s;
        }

        .header-container {
            display: flex;
            justify-content: center;
            align-items: center;
            position: relative;
            padding: 0 20px;
        }

        .main-title {
            margin-top: 10px;
            margin-bottom: 10px;
            font-size: 1.5rem;
            color: var(--primary-color);
        }

        /* Estilos do botão de alternância de tema */
        .theme-switcher {
            position: absolute;
            right: 20px;
            top: 50%;
            transform: translateY(-50%);
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--text-color);
        }

        .switch {
            position: relative;
            display: inline-block;
            width: 40px;
            height: 20px;
        }

        .switch input {
            display: none;
        }

        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .4s;
            border-radius: 20px;
        }

        .slider:before {
            position: absolute;
            content: "";
            height: 14px;
            width: 14px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }

        input:checked+.slider {
            background-color: var(--highlight-color);
        }

        input:checked+.slider:before {
            transform: translateX(20px);
        }

        .main-container {
            display: flex;
            gap: 20px;
            align-items: flex-start;
            max-width: 1400px;
            margin: 0 auto;
        }

        .stations-container,
        #player-container {
            background-color: var(--card-bg-color);
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 12px var(--shadow-color);
            transition: background-color 0.3s;
        }

        .stations-container {
            flex: 1;
            display: flex;
            gap: 20px;
        }

        .category-column {
            flex: 1;
            min-width: 0;
        }

        .category-column h2 {
            margin-top: 0;
            margin-bottom: 16px;
            border-bottom: 2px solid var(--border-color);
            padding-bottom: 8px;
            color: var(--secondary-text-color);
            font-size: 1.2rem;
        }

        .station-item {
            padding: 10px;
            border-radius: 6px;
            background-color: var(--item-bg-color);
            border: 1px solid var(--border-color);
            cursor: pointer;
            text-align: left;
            transition: background-color 0.2s ease, box-shadow 0.2s ease;
            font-weight: 500;
            font-size: 0.9rem;
            margin-bottom: 8px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            outline: none;
            color: var(--text-color);
        }

        .station-item:hover {
            background-color: var(--item-hover-bg-color);
        }

        .station-item.highlighted {
            box-shadow: 0 0 0 2px var(--highlight-color);
        }

        .station-item.active {
            background-color: var(--highlight-color);
            color: white;
            border-color: var(--primary-color);
            font-weight: bold;
        }

        #player-container {
            width: 320px;
            flex-shrink: 0;
            text-align: center;
            position: sticky;
            top: 20px;
        }

        #player-container h2 {
            margin-top: 0;
            font-size: 1.1rem;
        }

        #current-station {
            font-weight: bold;
            color: var(--primary-color);
            display: block;
            margin-top: 8px;
            min-height: 36px;
        }

        audio {
            margin-top: 12px;
            width: 100%;
            /* Estilo para o player de audio no tema escuro */
            filter: var(--bg-color)_#18191a invert(95%) sepia(6%) saturate(82%) hue-rotate(191deg) brightness(95%) contrast(93%);
        }

        body.dark-mode audio {
            filter: invert(95%) sepia(6%) saturate(82%) hue-rotate(191deg) brightness(95%) contrast(93%);
        }


        #stop-button {
            padding: 8px 16px;
            border: none;
            background-color: #dc3545;
            color: white;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            margin-top: 12px;
            transition: background-color 0.2s ease;
        }

        #stop-button:hover {
            background-color: #c82333;
        }

        @media screen and (max-width: 768px) {
            /* .header-container {
                display: grid;
                grid-template-areas:
                    "login"
                    "title-theme";
                justify-items: center;
                gap: 15px;
                padding: 15px;
            } */

            .main-title {
                position: static;
                transform: none;
                margin-right: 60px;
            }

            .title-theme-group {
                grid-area: title-theme;
                display: flex;
                align-items: center;
                gap: 50px;
            }

            .header-button {
                grid-area: login;
            }

            .theme-switcher {
                position: static;
                transform: none;
            }

            .main-container {
                flex-direction: column-reverse;
                align-items: center;
                width: 100%;

            }

            #player-container {
                position: static;
                width: 90%;
            }

            .stations-container {
                width: 90%;

            }

            .header-title {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 20px;
            }
        }
    </style>
</head>

<body>
    <?php include("../all/sidebar.php"); ?>

    <div class="header-container">
        <h1 class="main-title">Rádios Online ??</h1>
        <div class="theme-switcher">
            <i class="fas fa-moon"></i>
            <label class="switch">
                <input type="checkbox" id="theme-toggle">
                <span class="slider"></span>
            </label>
            <i class="fas fa-sun"></i>
        </div>
    </div>

    <div class="main-container">
        <div class="stations-container"></div>
        <div id="player-container">
            <h2>Tocando agora:</h2>
            <span id="current-station">Nenhuma</span>
            <audio id="radio-audio" controls crossorigin="anonymous"></audio>
            <br>
            <button id="stop-button">Parar</button>
        </div>
    </div>

    <script src="../js/jquery-3.6.0.min.js"></script>
    <script src="../js/bootstrap.bundle.min.js"></script>
    <script src="../js/bootstrap-select.min.js"></script>

    <script>
        const stationsByCategory = {
            "Pop / Hits / Outras": [{
                name: 'Web Radio Atividade FM',
                url: 'https://stream.zeno.fm/zyygz61qachvv'
            }, {
                name: 'Rock FM',
                url: 'https://stream.zeno.fm/ntdot1fib96tv'
            }, {
                name: 'Churrasco FM',
                url: 'https://stream.zeno.fm/f67fcdnvpqzvv'
            }, {
                name: 'Light FM',
                url: 'https://stream.zeno.fm/jzyoimijevptv'
            }, {
                name: 'Radio Hits',
                url: 'https://wz7.servidoresbrasil.com:8162/stream'
            }, {
                //     name: 'Antena 1',
                //     url: 'http://antena1.newradio.it/stream?ext=.mp3'
                // }, {
                name: 'Rádio FM O DIA',
                url: 'http://streaming.livespanel.com:20000/live'
            }, {
                name: 'Rádio JOVEM PAM',
                url: 'https://stream-170.zeno.fm/c45wbq2us3buv'
            }, {
                name: 'Nightride FM',
                url: 'https://stream.nightride.fm/nightride.mp3'
            }, {
                name: 'Lofi 24h',
                url: 'https://stream-169.zeno.fm/k7catc4s91zuv'
            }, {
                name: 'Alok',
                url: 'https://stream-170.zeno.fm/3as8dzs98a0uv'
            }],
            "Gospel": [{
                name: 'Maranata Rio 107.3 FM',
                url: 'https://s03.svrdedicado.org:7564/stream'
            }, {
                name: 'Multisom Gospel 99.3 FM',
                url: 'https://servidor38-2.brlogic.com:8156/live'
            }, {
                name: 'Melodia FM',
                url: 'https://27433.live.streamtheworld.com/MELODIAFMAAC.aac'
            }, {
                name: 'Gospel Brasil',
                url: 'https://stm2.alphanetdigital.com.br:9818/stream'
            }, {
                name: 'Gospel FM',
                url: 'https://stm43.srvstm.com:8954/stream'
            }, {
                name: 'Rádio Shekinah',
                url: 'https://player.voxpainel.com.br/proxy/7076'
            }, {
                name: 'Rádio Louvor',
                url: 'https://stream-153.zeno.fm/35rk7gcpn3quv'
            }, {
                name: 'Louvor e Avivamento',
                url: 'https://stm1.xcast.com.br:9616/stream'
            }, {
                name: 'Gospel FM Vós Sois a Luz',
                url: 'https://stream-178.zeno.fm/a7yw68sbqxhvv'
            }, {
                name: 'Recordações Gospel',
                url: 'https://stream-154.zeno.fm/v170rpknne2vv'
            }]
        };

        const stationsContainer = document.querySelector('.stations-container');
        const audioElement = document.getElementById('radio-audio');
        const currentStationSpan = document.getElementById('current-station');
        const stopButton = document.getElementById('stop-button');

        let stationElements = [];
        let highlightedCol = 0;
        let highlightedRow = 0;

        function renderStations() {
            stationsContainer.innerHTML = '';
            stationElements = [];

            Object.keys(stationsByCategory).forEach(categoryName => {
                const column = document.createElement('div');
                column.classList.add('category-column');
                const title = document.createElement('h2');
                title.textContent = categoryName;
                column.appendChild(title);

                const stationsInCat = stationsByCategory[categoryName];
                const columnElements = [];

                stationsInCat.forEach(station => {
                    const stationItem = document.createElement('div');
                    stationItem.classList.add('station-item');
                    stationItem.textContent = station.name;
                    stationItem.title = station.name;
                    stationItem.onclick = () => playStation(stationItem, station.name, station.url);
                    column.appendChild(stationItem);
                    columnElements.push(stationItem);
                });

                stationsContainer.appendChild(column);
                stationElements.push(columnElements);
            });
            updateHighlight(false);
        }

        function playStation(element, stationName, streamUrl) {
            document.querySelectorAll('.station-item').forEach(item => item.classList.remove('active'));
            element.classList.add('active');
            updateHighlightFromElement(element);

            audioElement.src = streamUrl;
            audioElement.play().catch(e => {
                console.error("Erro ao tocar a rádio:", stationName, e);
                currentStationSpan.textContent = "Erro ao tocar!";
                element.classList.remove('active');
            });
            currentStationSpan.textContent = stationName;
        }

        stopButton.addEventListener('click', () => {
            document.querySelectorAll('.station-item').forEach(item => {
                item.classList.remove('active');
                item.classList.remove('highlighted');
            });
            audioElement.pause();
            audioElement.src = '';
            currentStationSpan.textContent = 'Nenhuma';
        });

        function updateHighlight(shouldScroll = true) {
            document.querySelectorAll('.station-item').forEach(item => item.classList.remove('highlighted'));
            const elementToHighlight = stationElements[highlightedCol]?.[highlightedRow];
            if (elementToHighlight) {
                elementToHighlight.classList.add('highlighted');
                if (shouldScroll) {
                    elementToHighlight.scrollIntoView({
                        block: 'nearest',
                        behavior: 'smooth'
                    });
                }
            }
        }

        function updateHighlightFromElement(element) {
            for (let c = 0; c < stationElements.length; c++) {
                for (let r = 0; r < stationElements[c].length; r++) {
                    if (stationElements[c][r] === element) {
                        highlightedCol = c;
                        highlightedRow = r;
                        updateHighlight(false);
                        return;
                    }
                }
            }
        }

        document.addEventListener('keydown', (event) => {
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(event.code)) {
                event.preventDefault();
            }

            switch (event.code) {
                case 'Space':
                    if (audioElement.src) {
                        audioElement.paused ? audioElement.play() : audioElement.pause();
                    }
                    break;
                case 'ArrowUp':
                    if (highlightedRow > 0) {
                        highlightedRow--;
                        updateHighlight();
                    }
                    break;
                case 'ArrowDown':
                    if (highlightedRow < stationElements[highlightedCol].length - 1) {
                        highlightedRow++;
                        updateHighlight();
                    }
                    break;
                case 'ArrowLeft':
                    if (highlightedCol > 0) {
                        highlightedCol--;
                        highlightedRow = Math.min(highlightedRow, stationElements[highlightedCol].length - 1);
                        updateHighlight();
                    }
                    break;
                case 'ArrowRight':
                    if (highlightedCol < stationElements.length - 1) {
                        highlightedCol++;
                        highlightedRow = Math.min(highlightedRow, stationElements[highlightedCol].length - 1);
                        updateHighlight();
                    }
                    break;
                case 'Enter':
                    const highlightedElement = stationElements[highlightedCol]?.[highlightedRow];
                    if (highlightedElement) {
                        highlightedElement.click();
                    }
                    break;
            }
        });

        // --- NOVO CÓDIGO PARA O TEMA ESCURO ---
        const themeToggle = document.getElementById('theme-toggle');
        const body = document.body;

        // Função para aplicar o tema salvo
        function applyTheme(theme) {
            if (theme === 'dark') {
                body.classList.add('dark-mode');
                themeToggle.checked = true;
            } else {
                body.classList.remove('dark-mode');
                themeToggle.checked = false;
            }
        }

        // Evento para o botão de alternância
        themeToggle.addEventListener('change', () => {
            if (themeToggle.checked) {
                localStorage.setItem('theme', 'dark');
                applyTheme('dark');
            } else {
                localStorage.setItem('theme', 'light');
                applyTheme('light');
            }
        });

        // Verifica se há um tema salvo no localStorage ao carregar a página
        const savedTheme = localStorage.getItem('theme') || 'light';
        applyTheme(savedTheme);


        renderStations();
    </script>

</body>

</html>