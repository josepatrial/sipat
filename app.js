/**
 * Sistema de Sorteio SIPAT - Grupo 2 Irmãos
 * Desenvolvido para funcionamento 100% offline e telões
 */

(function () {
  'use strict';

  // --- Estado da Aplicação ---
  let allNames = [];
  let remainingNames = [];
  let winners = [];
  let isSpinning = false;
  let soundEnabled = true;
  let currentRotation = 0; // em radianos
  let spinAnimationId = null;

  // Nomes de demonstração inicial para teste imediato
  const SAMPLE_NAMES = [
    "Carlos Eduardo Silva",
    "Mariana Alcantara",
    "João Pedro Silveira",
    "Fernanda Vasconcelos",
    "Roberto Oliveira",
    "Juliana Medeiros",
    "Lucas Guimarães",
    "Patrícia Mendonça",
    "Marcos Vinícius Santos",
    "Camila Rodrigues",
    "Diego Ferreira Lima",
    "Beatriz Albuquerque",
    "Gabriel Henrique Dias",
    "Aline Costa Souza",
    "Rodrigo Mendes"
  ];

  // Paleta de cores vibrantes para a roleta
  const SLICE_COLORS = [
    { bg: "#10b981", text: "#ffffff" }, // Verde Esmeralda
    { bg: "#3b82f6", text: "#ffffff" }, // Azul Real
    { bg: "#f59e0b", text: "#1e293b" }, // Dourado Âmbar
    { bg: "#8b5cf6", text: "#ffffff" }, // Roxo
    { bg: "#ef4444", text: "#ffffff" }, // Vermelho
    { bg: "#06b6d4", text: "#ffffff" }, // Ciano
    { bg: "#ec4899", text: "#ffffff" }, // Rosa
    { bg: "#14b8a6", text: "#ffffff" }, // Turquesa
    { bg: "#f97316", text: "#ffffff" }, // Laranja
    { bg: "#6366f1", text: "#ffffff" }, // Índigo
  ];

  // --- Elementos do DOM ---
  const canvas = document.getElementById("wheelCanvas");
  const ctx = canvas.getContext("2d");
  const btnSpin = document.getElementById("btnSpin");
  const btnSpinCenter = document.getElementById("btnSpinCenter");
  const btnQuickDraw = document.getElementById("btnQuickDraw");
  const inputCurrentPrize = document.getElementById("inputCurrentPrize");
  const btnConfig = document.getElementById("btnConfig");
  const btnFullscreen = document.getElementById("btnFullscreen");
  const btnSoundToggle = document.getElementById("btnSoundToggle");
  const soundIcon = document.getElementById("soundIcon");
  const btnExportWinners = document.getElementById("btnExportWinners");
  const btnResetRound = document.getElementById("btnResetRound");

  // Estatísticas
  const statTotal = document.getElementById("statTotal");
  const statRemaining = document.getElementById("statRemaining");
  const statDrawn = document.getElementById("statDrawn");
  const winnersCountBadge = document.getElementById("winnersCountBadge");
  const winnersList = document.getElementById("winnersList");
  const emptyWinners = document.getElementById("emptyWinners");

  // Modais
  const modalConfig = document.getElementById("modalConfig");
  const btnCloseConfig = document.getElementById("btnCloseConfig");
  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const manualNamesArea = document.getElementById("manualNamesArea");
  const btnLoadManual = document.getElementById("btnLoadManual");
  const btnUseSample = document.getElementById("btnUseSample");
  const btnSaveConfig = document.getElementById("btnSaveConfig");
  const previewBox = document.getElementById("previewBox");
  const previewTags = document.getElementById("previewTags");
  const previewCount = document.getElementById("previewCount");

  const modalWinner = document.getElementById("modalWinner");
  const winnerName = document.getElementById("winnerName");
  const winnerPrizeName = document.getElementById("winnerPrizeName");
  const btnConfirmWinner = document.getElementById("btnConfirmWinner");

  const modalRoundFinished = document.getElementById("modalRoundFinished");
  const btnRestartAll = document.getElementById("btnRestartAll");

  // Patrocinadores
  const modalSponsors = document.getElementById("modalSponsors");
  const btnCloseSponsors = document.getElementById("btnCloseSponsors");
  const btnCloseSponsorsBtn = document.getElementById("btnCloseSponsorsBtn");
  const btnViewAllSponsors = document.getElementById("btnViewAllSponsors");
  const sponsorsTrack = document.getElementById("sponsorsTrack");

  // --- Sistema de Áudio Sintetizado (Web Audio API) ---
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  }

  // Som de tick mecânico da roleta
  function playTickSound() {
    if (!soundEnabled) return;
    initAudio();
    if (!audioCtx) return;

    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.045);
    } catch (e) {
      console.warn("Audio tick erro:", e);
    }
  }

  // Fanfarra triunfal ao sortear o ganhador
  function playVictorySound() {
    if (!soundEnabled) return;
    initAudio();
    if (!audioCtx) return;

    try {
      const now = audioCtx.currentTime;
      const notes = [
        { freq: 523.25, time: 0.0, dur: 0.15 }, // C5
        { freq: 659.25, time: 0.15, dur: 0.15 }, // E5
        { freq: 783.99, time: 0.30, dur: 0.20 }, // G5
        { freq: 1046.50, time: 0.50, dur: 0.60 } // C6
      ];

      notes.forEach((note) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(note.freq, now + note.time);

        gain.gain.setValueAtTime(0.3, now + note.time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now + note.time);
        osc.stop(now + note.time + note.dur);
      });
    } catch (e) {
      console.warn("Audio victory erro:", e);
    }
  }

  // --- Persistência Local (LocalStorage) ---
  function saveState() {
    try {
      const state = {
        allNames,
        remainingNames,
        winners,
        currentPrize: inputCurrentPrize.value
      };
      localStorage.setItem("sipat_sorteio_state", JSON.stringify(state));
    } catch (e) {
      console.warn("Não foi possível salvar estado no localStorage:", e);
    }
  }

  function loadState() {
    try {
      const saved = localStorage.getItem("sipat_sorteio_state");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.allNames) && parsed.allNames.length > 0) {
          allNames = parsed.allNames;
          remainingNames = Array.isArray(parsed.remainingNames) ? parsed.remainingNames : [...allNames];
          winners = Array.isArray(parsed.winners) ? parsed.winners : [];
          if (parsed.currentPrize) {
            inputCurrentPrize.value = parsed.currentPrize;
          }
          return true;
        }
      }
    } catch (e) {
      console.warn("Erro ao ler localStorage:", e);
    }
    return false;
  }

  // --- Atualização de Interface ---
  function updateStatsAndLists() {
    statTotal.textContent = allNames.length;
    statRemaining.textContent = remainingNames.length;
    statDrawn.textContent = winners.length;
    winnersCountBadge.textContent = winners.length;

    // Atualiza lista de ganhadores
    winnersList.innerHTML = "";
    if (winners.length === 0) {
      emptyWinners.style.display = "flex";
      winnersList.appendChild(emptyWinners);
    } else {
      emptyWinners.style.display = "none";
      // Exibe os mais recentes no topo
      winners.slice().reverse().forEach((item, index) => {
        const actualIndex = winners.length - index;
        const div = document.createElement("div");
        div.className = "winner-item";
        div.innerHTML = `
          <div class="winner-item-index">#${actualIndex}</div>
          <div class="winner-item-content">
            <div class="winner-item-name">${escapeHtml(item.name)}</div>
            <div class="winner-item-sub">
              <span>🎁 ${escapeHtml(item.prize || "Brinde")}</span>
              <span>⏰ ${item.time || ""}</span>
            </div>
          </div>
        `;
        winnersList.appendChild(div);
      });
    }

    drawWheel();
    saveState();
  }

  function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }

  // --- Renderização da Roleta (Canvas) ---
  function getDisplayList() {
    // Se não há nomes restantes, usa a lista completa ou um placeholder
    if (remainingNames.length === 0) {
      return allNames.length > 0 ? allNames : ["Carregue os Nomes"];
    }
    return remainingNames;
  }

  function drawWheel() {
    const list = getDisplayList();
    const count = list.length;
    const width = canvas.width;
    const height = canvas.height;
    const center = width / 2;
    const radius = center - 18;

    ctx.clearRect(0, 0, width, height);

    // Quando há centenas de nomes, uma roleta com 300 fatias fica ilegível.
    // Portanto limitamos a exibição visual a até 32 fatias estilizadas, 
    // mas o sorteio considera 100% dos nomes da lista real com perfeita probabilidade!
    const isCondensed = count > 32;
    const visualSlices = isCondensed ? Math.min(count, 32) : count;
    const sliceAngle = (2 * Math.PI) / visualSlices;

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(currentRotation);

    // 1. Desenha as fatias
    for (let i = 0; i < visualSlices; i++) {
      const angleStart = i * sliceAngle;
      const angleEnd = angleStart + sliceAngle;
      const colorScheme = SLICE_COLORS[i % SLICE_COLORS.length];

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, angleStart, angleEnd);
      ctx.closePath();

      ctx.fillStyle = colorScheme.bg;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.stroke();

      // Desenha o texto do nome na fatia
      ctx.save();
      ctx.rotate(angleStart + sliceAngle / 2);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = colorScheme.text;

      let nameText = "";
      if (isCondensed) {
        // Mostra nomes distribuídos
        const indexInReal = Math.floor((i / visualSlices) * count);
        nameText = list[indexInReal] || `Participante ${i + 1}`;
      } else {
        nameText = list[i];
      }

      // Ajusta tamanho da fonte conforme número de fatias
      let fontSize = visualSlices <= 8 ? 20 : visualSlices <= 16 ? 16 : visualSlices <= 24 ? 13 : 11;
      ctx.font = `bold ${fontSize}px 'Montserrat', sans-serif`;

      // Trunca o nome se for longo demais para caber no raio
      const maxTextWidth = radius - 75;
      let truncated = nameText;
      if (ctx.measureText(truncated).width > maxTextWidth) {
        while (truncated.length > 3 && ctx.measureText(truncated + "...").width > maxTextWidth) {
          truncated = truncated.slice(0, -1);
        }
        truncated += "...";
      }

      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 4;
      ctx.fillText(truncated, radius - 28, 0);
      ctx.restore();
    }

    // 2. Borda externa decorativa com pinos (LEDs/rebites)
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 14;
    ctx.strokeStyle = "#1e293b";
    ctx.stroke();

    // Pinos dourados nas bordas
    const pinCount = Math.max(visualSlices, 24);
    for (let p = 0; p < pinCount; p++) {
      const pAngle = (p * 2 * Math.PI) / pinCount;
      const px = Math.cos(pAngle) * (radius - 2);
      const py = Math.sin(pAngle) * (radius - 2);

      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, 2 * Math.PI);
      ctx.fillStyle = "#fbbf24";
      ctx.shadowColor = "#f59e0b";
      ctx.shadowBlur = 6;
      ctx.fill();
    }

    ctx.restore(); // Restaura rotação

    // 3. Moldura Externa Fixa
    ctx.beginPath();
    ctx.arc(center, center, radius + 7, 0, 2 * Math.PI);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
    ctx.stroke();
  }

  // --- Lógica do Giro e Sorteio ---
  function spinWheel(isQuick = false) {
    if (isSpinning) return;

    if (remainingNames.length === 0) {
      if (allNames.length === 0) {
        openModal(modalConfig);
        return;
      }
      openModal(modalRoundFinished);
      return;
    }

    initAudio();
    isSpinning = true;
    btnSpin.disabled = true;
    btnSpinCenter.disabled = true;
    btnQuickDraw.disabled = true;

    // Escolhe o ganhador aleatoriamente com segurança
    const winningIndex = Math.floor(Math.random() * remainingNames.length);
    const chosenWinner = remainingNames[winningIndex];

    const count = remainingNames.length;
    const isCondensed = count > 32;
    const visualSlices = isCondensed ? Math.min(count, 32) : count;
    const sliceAngle = (2 * Math.PI) / visualSlices;

    // O ponteiro fica no topo (3 * PI / 2 radianos, ou 270 graus).
    // Queremos que a fatia correspondente ao ganhador pare exatamente no topo.
    let targetSlice = isCondensed
      ? Math.floor((winningIndex / count) * visualSlices)
      : winningIndex;

    // Ângulo central da fatia
    const sliceCenterAngle = targetSlice * sliceAngle + sliceAngle / 2;

    // O ponteiro está em -PI/2 (270 graus). 
    // Para a fatia apontar para -PI/2, currentRotation + sliceCenterAngle ≡ 3*PI/2 (mod 2*PI)
    // Logo, targetRotationOffset = (3*PI/2 - sliceCenterAngle)
    const targetAngle = (3 * Math.PI / 2) - sliceCenterAngle;

    // Quantidade de voltas completas para gerar suspense (entre 5 e 8 voltas no normal, 1 volta no rápido)
    const extraRotations = isQuick ? 2 : 6 + Math.floor(Math.random() * 3);
    const totalAngleToRotate = (extraRotations * 2 * Math.PI) + ((targetAngle - (currentRotation % (2 * Math.PI)) + 4 * Math.PI) % (2 * Math.PI));

    const startRotation = currentRotation;
    const endRotation = startRotation + totalAngleToRotate;
    const duration = isQuick ? 1200 : 5200; // milissegundos
    const startTime = performance.now();
    let lastTickAngle = startRotation;

    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Função de desaceleração suave (Ease Out Cubic / Quartic)
      const easeOut = 1 - Math.pow(1 - progress, 3.5);
      currentRotation = startRotation + (endRotation - startRotation) * easeOut;

      // Emite o tick sonoro conforme gira
      if (Math.abs(currentRotation - lastTickAngle) >= sliceAngle) {
        playTickSound();
        lastTickAngle = currentRotation;
      }

      drawWheel();

      if (progress < 1) {
        spinAnimationId = requestAnimationFrame(animate);
      } else {
        // Giro finalizado com sucesso!
        isSpinning = false;
        btnSpin.disabled = false;
        btnSpinCenter.disabled = false;
        btnQuickDraw.disabled = false;

        finishSpin(chosenWinner, winningIndex);
      }
    }

    spinAnimationId = requestAnimationFrame(animate);
  }

  function finishSpin(winner, index) {
    playVictorySound();

    // Dispara chuva de confetes
    if (typeof confetti === "function") {
      const count = 200;
      const defaults = { origin: { y: 0.6 } };

      function fire(particleRatio, opts) {
        confetti(Object.assign({}, defaults, opts, {
          particleCount: Math.floor(count * particleRatio)
        }));
      }

      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });
    }

    // Registra brinde atual
    const currentPrize = inputCurrentPrize.value.trim() || "Brinde SIPAT";
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Remove do array de restantes
    remainingNames.splice(index, 1);

    // Adiciona aos vencedores
    const winnerRecord = {
      name: winner,
      prize: currentPrize,
      time: timeFormatted,
      timestamp: Date.now()
    };
    winners.push(winnerRecord);

    // Abre modal de parabéns
    winnerName.textContent = winner;
    winnerPrizeName.textContent = currentPrize;
    openModal(modalWinner);

    // Atualiza contadores e listas
    updateStatsAndLists();
  }

  // --- Importação de Planilhas (Excel e CSV) ---
  function parseSpreadsheet(dataBuffer) {
    if (typeof XLSX === "undefined") {
      alert("A biblioteca SheetJS (XLSX) não foi encontrada. Tente colar os nomes manualmente.");
      return;
    }

    try {
      const workbook = XLSX.read(dataBuffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (!rows || rows.length === 0) {
        alert("A planilha selecionada está vazia!");
        return;
      }

      // Procura a coluna de nomes:
      // Analisa o cabeçalho (linha 0) ou busca a coluna com mais strings
      let nameColumnIndex = 0;
      const headerRow = rows[0];

      if (Array.isArray(headerRow)) {
        const keywords = ["nome", "participante", "colaborador", "funcionario", "name", "pessoa"];
        const foundIndex = headerRow.findIndex(cell => {
          if (!cell) return false;
          const str = String(cell).toLowerCase().trim();
          return keywords.some(kw => str.includes(kw));
        });
        if (foundIndex !== -1) {
          nameColumnIndex = foundIndex;
        }
      }

      const extractedNames = [];
      const startRow = (Array.isArray(headerRow) && typeof headerRow[nameColumnIndex] === "string" &&
        headerRow[nameColumnIndex].toLowerCase().includes("nome")) ? 1 : 0;

      for (let r = startRow; r < rows.length; r++) {
        const row = rows[r];
        if (row && row[nameColumnIndex] !== undefined && row[nameColumnIndex] !== null) {
          const val = String(row[nameColumnIndex]).trim();
          // Ignora se for cabeçalho repetido ou vazio
          if (val && val.toLowerCase() !== "nome" && val.length > 1) {
            extractedNames.push(val);
          }
        }
      }

      if (extractedNames.length === 0) {
        alert("Nenhum nome válido foi encontrado na planilha. Verifique as colunas.");
        return;
      }

      setLoadedNames(extractedNames);
    } catch (err) {
      console.error("Erro ao ler planilha:", err);
      alert("Houve um erro ao processar a planilha. Certifique-se de que o arquivo é válido.");
    }
  }

  function handleFileSelect(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      parseSpreadsheet(data);
    };
    reader.readAsArrayBuffer(file);
  }

  function setLoadedNames(names) {
    // Remove duplicados acidentais e linhas em branco
    const cleanNames = [...new Set(names.map(n => n.trim()).filter(Boolean))];

    if (cleanNames.length === 0) {
      alert("Nenhum nome encontrado!");
      return;
    }

    // Exibe pré-visualização
    previewCount.textContent = cleanNames.length;
    previewTags.innerHTML = cleanNames.slice(0, 40).map(n => `<span class="preview-tag">${escapeHtml(n)}</span>`).join("");
    if (cleanNames.length > 40) {
      previewTags.innerHTML += `<span class="preview-tag" style="background:#059669;">+ ${cleanNames.length - 40} outros...</span>`;
    }
    previewBox.style.display = "block";

    // Armazena temporariamente no input manual para o usuário ver
    manualNamesArea.value = cleanNames.join("\n");
  }

  function applyConfiguredNames() {
    const text = manualNamesArea.value.trim();
    if (!text) {
      alert("Nenhum nome para carregar! Importe uma planilha ou digite os nomes.");
      return;
    }

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const unique = [...new Set(lines)];

    if (unique.length === 0) {
      alert("Digite ou importe pelo menos 1 nome!");
      return;
    }

    allNames = unique;
    remainingNames = [...allNames];
    winners = []; // reinicia histórico com nova lista

    updateStatsAndLists();
    closeModal(modalConfig);
    alert(`Sucesso! ${allNames.length} participantes carregados para o sorteio.`);
  }

  // --- Exportar Lista de Ganhadores para Excel ---
  function exportWinners() {
    if (winners.length === 0) {
      alert("Nenhum ganhador registrado para exportar!");
      return;
    }

    const exportData = winners.map((w, idx) => ({
      "Ordem": idx + 1,
      "Nome do Ganhador": w.name,
      "Brinde": w.prize || "Brinde SIPAT",
      "Horário": w.time || ""
    }));

    if (typeof XLSX !== "undefined") {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ganhadores SIPAT");
      XLSX.writeFile(wb, "Sorteio_SIPAT_Grupo_2_Irmaos_Ganhadores.xlsx");
    } else {
      // Fallback para CSV
      let csv = "Ordem,Nome do Ganhador,Brinde,Horario\n";
      exportData.forEach(r => {
        csv += `"${r.Ordem}","${r["Nome do Ganhador"]}","${r.Brinde}","${r.Horário}"\n`;
      });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ganhadores_sipat.csv";
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  // --- Reinício da Rodada ---
  function resetRound(confirmPrompt = true) {
    if (confirmPrompt) {
      const ok = confirm("Deseja realmente reiniciar a rodada com TODOS os nomes novamente? O histórico de ganhadores da rodada será limpo para a nova rodada.");
      if (!ok) return;
    }

    remainingNames = [...allNames];
    winners = []; // Limpa o histórico de ganhadores da rodada
    updateStatsAndLists();
    closeModal(modalRoundFinished);
    alert("Rodada reiniciada! Todos os participantes estão disponíveis novamente e o histórico de ganhadores foi limpo.");
  }

  // --- Controle de Modais ---
  function openModal(modal) {
    if (modal) modal.classList.add("active");
  }

  function closeModal(modal) {
    if (modal) modal.classList.remove("active");
  }

  // --- Event Listeners ---
  btnSpin.addEventListener("click", () => spinWheel(false));
  btnSpinCenter.addEventListener("click", () => spinWheel(false));
  btnQuickDraw.addEventListener("click", () => spinWheel(true));

  btnConfig.addEventListener("click", () => {
    manualNamesArea.value = allNames.join("\n");
    if (allNames.length > 0) {
      setLoadedNames(allNames);
    }
    openModal(modalConfig);
  });

  btnCloseConfig.addEventListener("click", () => closeModal(modalConfig));

  // Drag and Drop de Arquivos
  dropZone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  });

  btnLoadManual.addEventListener("click", () => {
    const text = manualNamesArea.value.trim();
    if (text) {
      const names = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      setLoadedNames(names);
    } else {
      alert("Cole ou digite os nomes no campo de texto primeiro.");
    }
  });

  btnUseSample.addEventListener("click", () => {
    setLoadedNames(SAMPLE_NAMES);
  });

  btnSaveConfig.addEventListener("click", applyConfiguredNames);

  btnConfirmWinner.addEventListener("click", () => {
    closeModal(modalWinner);
    // Se acabaram todos os nomes, dispara modal de fim da rodada
    if (remainingNames.length === 0) {
      setTimeout(() => {
        openModal(modalRoundFinished);
      }, 500);
    }
  });

  btnRestartAll.addEventListener("click", () => resetRound(false));
  btnResetRound.addEventListener("click", () => resetRound(true));
  btnExportWinners.addEventListener("click", exportWinners);

  // Mute / Unmute
  btnSoundToggle.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    soundIcon.textContent = soundEnabled ? "🔊" : "🔇";
    btnSoundToggle.title = soundEnabled ? "Som Ativado (clique para mutar)" : "Som Desativado (clique para ativar)";
  });

  // Tela Cheia / Telão
  const fsLabel = document.getElementById("fsLabel");
  btnFullscreen.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn("Erro ao entrar em tela cheia:", err);
      });
      if (fsLabel) fsLabel.textContent = "Sair do Telão";
    } else {
      document.exitFullscreen().catch((err) => {
        console.warn("Erro ao sair de tela cheia:", err);
      });
      if (fsLabel) fsLabel.textContent = "Modo Telão";
    }
  });

  // Salva o brinde digitado ao mudar
  inputCurrentPrize.addEventListener("input", saveState);

  // Fecha modais clicando fora
  window.addEventListener("click", (e) => {
    if (e.target === modalConfig) closeModal(modalConfig);
    if (e.target === modalWinner) closeModal(modalWinner);
    if (e.target === modalRoundFinished) closeModal(modalRoundFinished);
    if (e.target === modalSponsors) closeModal(modalSponsors);
  });

  // Modal de Patrocinadores
  if (btnViewAllSponsors) {
    btnViewAllSponsors.addEventListener("click", () => openModal(modalSponsors));
  }
  if (btnCloseSponsors) {
    btnCloseSponsors.addEventListener("click", () => closeModal(modalSponsors));
  }
  if (btnCloseSponsorsBtn) {
    btnCloseSponsorsBtn.addEventListener("click", () => closeModal(modalSponsors));
  }

  // --- Carrossel de Patrocinadores (Recorte de Alta Fidelidade) ---
  const SPONSOR_SLICES = [
    // Linha 1 (y: 14, h: 64)
    { x: 12, y: 14, w: 94, h: 64 },   // Paiol
    { x: 112, y: 14, w: 106, h: 64 }, // Siatec
    { x: 224, y: 14, w: 120, h: 64 }, // Total Parts
    { x: 350, y: 14, w: 120, h: 64 }, // Certano
    { x: 476, y: 14, w: 116, h: 64 }, // Usiplat
    { x: 598, y: 14, w: 104, h: 64 }, // Dona Nena
    { x: 708, y: 14, w: 104, h: 64 }, // Nêgo
    { x: 818, y: 14, w: 90, h: 64 },  // Alquimia
    { x: 914, y: 14, w: 100, h: 64 }, // Linda Rosa

    // Linha 2 (y: 94, h: 64)
    { x: 14, y: 94, w: 100, h: 64 },  // Claro
    { x: 120, y: 94, w: 112, h: 64 }, // Chico's
    { x: 238, y: 94, w: 122, h: 64 }, // Metal Alpha
    { x: 366, y: 94, w: 132, h: 64 }, // Bebé
    { x: 506, y: 94, w: 88, h: 64 },  // Eng Tec
    { x: 600, y: 94, w: 86, h: 64 },  // Eletro Motores
    { x: 692, y: 94, w: 110, h: 64 }, // Avatim
    { x: 808, y: 94, w: 80, h: 64 },  // Raio de Luz
    { x: 894, y: 94, w: 120, h: 64 }, // Ekkos

    // Linha 3 (y: 174, h: 64)
    { x: 12, y: 174, w: 114, h: 64 }, // Eletro Service
    { x: 132, y: 174, w: 118, h: 64 },// Center Panos
    { x: 256, y: 174, w: 120, h: 64 },// JK
    { x: 382, y: 174, w: 118, h: 64 },// Construcasa
    { x: 506, y: 174, w: 94, h: 64 }, // Paulinho
    { x: 606, y: 174, w: 94, h: 64 }, // Bia
    { x: 706, y: 174, w: 102, h: 64 },// Honda
    { x: 814, y: 174, w: 98, h: 64 }, // Brasil Cacau
    { x: 918, y: 174, w: 96, h: 64 }, // Brum

    // Linha 4 (y: 256, h: 64)
    { x: 12, y: 256, w: 82, h: 64 },  // Abis
    { x: 100, y: 256, w: 78, h: 64 }, // Cuzzteano
    { x: 184, y: 256, w: 102, h: 64 },// ST
    { x: 292, y: 256, w: 130, h: 64 },// Molini's
    { x: 428, y: 256, w: 122, h: 64 },// Chama Gás
    { x: 556, y: 256, w: 100, h: 64 },// Norte Aço
    { x: 662, y: 256, w: 96, h: 64 }, // Marco Véio
    { x: 764, y: 256, w: 116, h: 64 },// Previni
    { x: 886, y: 256, w: 70, h: 64 }, // Soeto
    { x: 878, y: 256, w: 136, h: 64 },// Sicredi

    // Linha 5 (y: 340, h: 66)
    { x: 12, y: 340, w: 124, h: 66 }, // Cury
    { x: 142, y: 340, w: 112, h: 66 },// Tronbim
    { x: 260, y: 340, w: 132, h: 66 },// F2M
    { x: 400, y: 340, w: 146, h: 66 },// Aramon
    { x: 552, y: 340, w: 160, h: 66 },// Unimed
    { x: 718, y: 340, w: 136, h: 66 },// Sisprime
    { x: 860, y: 340, w: 152, h: 66 },// Fucam

    // Linha 6 (y: 424, h: 68)
    { x: 12, y: 424, w: 120, h: 68 }, // Brasil Cacau
    { x: 138, y: 424, w: 174, h: 68 },// Lamipack
    { x: 320, y: 424, w: 202, h: 68 },// Tarfil
    { x: 530, y: 424, w: 242, h: 68 },// Toyota
    { x: 780, y: 424, w: 232, h: 68 },// EletroLomba

    // Linha 7 (y: 508, h: 64)
    { x: 12, y: 508, w: 232, h: 64 }, // Color Tintas Coral
    { x: 250, y: 508, w: 174, h: 64 },// João Crisóstomo
    { x: 432, y: 508, w: 196, h: 64 },// Central Art
    { x: 636, y: 508, w: 166, h: 64 },// Lubrificantes.com
    { x: 808, y: 508, w: 204, h: 64 } // Sopasta
  ];

  function initSponsorsCarousel() {
    if (!sponsorsTrack) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "patrocinadores.jpg";

    img.onload = function () {
      const offCanvas = document.createElement("canvas");
      const offCtx = offCanvas.getContext("2d");
      const fragment = document.createDocumentFragment();

      const cardsDataUrls = [];

      SPONSOR_SLICES.forEach((slice) => {
        offCanvas.width = slice.w;
        offCanvas.height = slice.h;
        offCtx.clearRect(0, 0, slice.w, slice.h);
        offCtx.drawImage(
          img,
          slice.x, slice.y, slice.w, slice.h,
          0, 0, slice.w, slice.h
        );
        cardsDataUrls.push(offCanvas.toDataURL("image/png"));
      });

      // Função auxiliar para criar cards
      function appendCards(list) {
        list.forEach((dataUrl) => {
          const card = document.createElement("div");
          card.className = "sponsor-card";
          card.title = "Patrocinador Oficial SIPAT (clique para ampliar)";
          const logoImg = document.createElement("img");
          logoImg.src = dataUrl;
          logoImg.alt = "Patrocinador";
          card.appendChild(logoImg);

          card.addEventListener("click", () => {
            openModal(modalSponsors);
          });

          fragment.appendChild(card);
        });
      }

      // Adiciona uma vez e duplica para rotação contínua (marquee infinito)
      appendCards(cardsDataUrls);
      appendCards(cardsDataUrls);

      sponsorsTrack.innerHTML = "";
      sponsorsTrack.appendChild(fragment);
    };

    img.onerror = function () {
      console.warn("Imagem de patrocinadores não pôde ser carregada.");
    };
  }

  // Tecla de atalho: Barra de Espaço para girar a roleta!
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !isSpinning && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
      e.preventDefault();
      spinWheel(false);
    }
  });

  // --- Inicialização ---
  const restored = loadState();
  if (!restored || allNames.length === 0) {
    allNames = [...SAMPLE_NAMES];
    remainingNames = [...allNames];
  }

  updateStatsAndLists();
  drawWheel();
  initSponsorsCarousel();
})();

