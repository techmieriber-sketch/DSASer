(function () {
        var app = document.getElementById("crosswordApp");
        if (!app) return;

        var cwArticle = app.closest("article");
        if (!cwArticle) return;

        var puzzle = {
          rows: 19,
          cols: 20,
          words: [
            {
              id: 1,
              answer: "FYSISK ARBEJDSMILJØ",
              clue: "De forhold omkring dig på arbejdspladsen, som påvirker kroppen og sikkerheden. Svar i to ord.",
              row: 2,
              col: 2,
              dir: "across"
            },
            {
              id: 2,
              answer: "PSYKISK ARBEJDSMILJØ",
              clue: "Den del af arbejdsmiljøet, der handler om trivsel, samarbejde og hvordan man har det mentalt. Svar i to ord.",
              row: 14,
              col: 1,
              dir: "across"
            },
            {
              id: 3,
              answer: "ARBEJDSMILJØ",
              clue: "De forhold, du arbejder under, og som har betydning for din trivsel og sundhed.",
              row: 1,
              col: 10,
              dir: "down"
            },
            {
              id: 4,
              answer: "TRIVSEL",
              clue: "At man har det godt og kan fungere i sit arbejde.",
              row: 13,
              col: 10,
              dir: "down"
            },
            {
              id: 5,
              answer: "BELASTNING",
              clue: "Noget i arbejdet, som gør kroppen eller hovedet mere træt eller presset.",
              row: 2,
              col: 11,
              dir: "down"
            },
            {
              id: 6,
              answer: "SIKKERHED",
              clue: "At arbejdet kan udføres uden unødig fare for uheld eller skader.",
              row: 6,
              col: 14,
              dir: "down"
            }
          ]
        };

        var board = document.getElementById("board");
        var clueList = document.getElementById("clueList");
        var status = document.getElementById("status");
        var clearSelectedBtn = document.getElementById("clearSelectedBtn");
        var clearAllBtn = document.getElementById("clearAllBtn");

        if (!board || !clueList || !status || !clearSelectedBtn || !clearAllBtn) return;

        /**
         * Lydfiler ligger i samme mappe som denne HTML-fil (kryds-og-tværs/).
         * - Overskrift: CW_AUDIO.pageTitle ("Kryds og tvaer om arbejdsmiljoe.mp3")
         * - Intro/vejledning: CW_AUDIO.intro ("Saadan goer du.mp3")
         * - Tip 1–6: "1.mp3", "2.mp3", … "6.mp3" (samme nummer som på tip-listen)
         */
        var CW_AUDIO = {
          pageTitle: "Kryds og tvaer om arbejdsmiljoe.mp3",
          intro: "Saadan goer du.mp3",
          clueFile: function (id) {
            return String(id) + ".mp3";
          }
        };

        var titleAudioBtn = document.getElementById("cwTitleAudioBtn");
        if (titleAudioBtn) {
          titleAudioBtn.setAttribute("data-audio", CW_AUDIO.pageTitle);
        }

        var introAudioBtn = document.getElementById("cwIntroAudioBtn");
        if (introAudioBtn) {
          introAudioBtn.setAttribute("data-audio", CW_AUDIO.intro);
        }

        var currentCwAudio = null;
        var currentCwAudioBtn = null;

        function releasePriorCwAudio() {
          if (currentCwAudio) {
            try {
              currentCwAudio.pause();
              currentCwAudio.currentTime = 0;
            } catch (err) {}
            currentCwAudio = null;
          }
          if (currentCwAudioBtn) {
            currentCwAudioBtn.classList.remove("is-audio-playing");
            currentCwAudioBtn.classList.remove("is-audio-paused");
            var playL = currentCwAudioBtn.getAttribute("data-aria-play");
            if (playL) currentCwAudioBtn.setAttribute("aria-label", playL);
            currentCwAudioBtn = null;
          }
        }

        function stashCwBtnAria(btn) {
          if (!btn.getAttribute("data-aria-play")) {
            btn.setAttribute("data-aria-play", btn.getAttribute("aria-label") || "Afspil");
          }
        }

        function updateCwAudioBtnAria(btn) {
          var idle = btn.getAttribute("data-aria-play");
          if (!btn.classList.contains("is-audio-playing") && !btn.classList.contains("is-audio-paused")) {
            if (idle) btn.setAttribute("aria-label", idle);
            return;
          }
          if (btn.classList.contains("is-audio-paused")) {
            btn.setAttribute("aria-label", "Fortsæt afspilning");
            return;
          }
          btn.setAttribute("aria-label", "Pause afspilning");
        }

        function playCwAudioFile(filename, buttonEl) {
          if (!filename || !buttonEl) return;
          stashCwBtnAria(buttonEl);
          if (currentCwAudioBtn === buttonEl && currentCwAudio) {
            if (!currentCwAudio.paused) {
              currentCwAudio.pause();
              buttonEl.classList.remove("is-audio-playing");
              buttonEl.classList.add("is-audio-paused");
              updateCwAudioBtnAria(buttonEl);
              return;
            }
            buttonEl.classList.remove("is-audio-paused");
            buttonEl.classList.add("is-audio-playing");
            var pr = currentCwAudio.play();
            if (pr !== undefined) {
              pr
                .then(function () {
                  updateCwAudioBtnAria(buttonEl);
                })
                .catch(function () {
                  releasePriorCwAudio();
                });
            } else {
              updateCwAudioBtnAria(buttonEl);
            }
            return;
          }
          releasePriorCwAudio();
          buttonEl.classList.remove("is-audio-paused");
          currentCwAudioBtn = buttonEl;
          buttonEl.classList.add("is-audio-playing");
          var src = new URL("./" + encodeURIComponent(filename), window.location.href).href;
          currentCwAudio = new Audio(src);
          currentCwAudio.addEventListener("ended", function onCwAudioEnd() {
            currentCwAudio.removeEventListener("ended", onCwAudioEnd);
            if (currentCwAudioBtn === buttonEl) {
              buttonEl.classList.remove("is-audio-playing");
              buttonEl.classList.remove("is-audio-paused");
              var pl = buttonEl.getAttribute("data-aria-play");
              if (pl) buttonEl.setAttribute("aria-label", pl);
              currentCwAudioBtn = null;
              try {
                currentCwAudio.currentTime = 0;
              } catch (e2) {}
              currentCwAudio = null;
            }
          });
          updateCwAudioBtnAria(buttonEl);
          var p0 = currentCwAudio.play();
          if (p0 !== undefined) {
            p0
              .then(function () {
                updateCwAudioBtnAria(buttonEl);
              })
              .catch(function () {
                releasePriorCwAudio();
              });
          } else {
            updateCwAudioBtnAria(buttonEl);
          }
        }

        function ensureCwAudioButtonIcons(btn) {
          var speaker = btn.querySelector(".crossword-audio-btn__svg--speaker");
          if (!speaker) {
            var raw = btn.querySelector(
              ".crossword-audio-btn__svg:not(.crossword-audio-btn__svg--pause):not(.crossword-audio-btn__svg--play)"
            );
            if (raw) {
              raw.classList.add("crossword-audio-btn__svg--speaker");
              speaker = raw;
            }
          }
          if (!speaker) return;
          var w = speaker.getAttribute("width") || "18";
          var h = speaker.getAttribute("height") || "18";
          if (!btn.querySelector(".crossword-audio-btn__svg--pause")) {
            var pauseSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            pauseSvg.setAttribute("class", "crossword-audio-btn__svg crossword-audio-btn__svg--pause");
            pauseSvg.setAttribute("width", w);
            pauseSvg.setAttribute("height", h);
            pauseSvg.setAttribute("viewBox", "0 0 24 24");
            pauseSvg.setAttribute("aria-hidden", "true");
            var u1 = document.createElementNS("http://www.w3.org/2000/svg", "use");
            u1.setAttribute("href", "#icon-pause");
            pauseSvg.appendChild(u1);
            btn.appendChild(pauseSvg);
          }
          if (!btn.querySelector(".crossword-audio-btn__svg--play")) {
            var playSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            playSvg.setAttribute("class", "crossword-audio-btn__svg crossword-audio-btn__svg--play");
            playSvg.setAttribute("width", w);
            playSvg.setAttribute("height", h);
            playSvg.setAttribute("viewBox", "0 0 24 24");
            playSvg.setAttribute("aria-hidden", "true");
            var u2 = document.createElementNS("http://www.w3.org/2000/svg", "use");
            u2.setAttribute("href", "#icon-play");
            playSvg.appendChild(u2);
            btn.appendChild(playSvg);
          }
        }

        function onCwAudioClick(e) {
          var btn = e.target.closest(".crossword-audio-btn");
          if (!btn || !cwArticle.contains(btn)) return;
          var file = btn.getAttribute("data-audio");
          if (!file) return;
          e.preventDefault();
          playCwAudioFile(file, btn);
        }

        board.style.gridTemplateColumns = "repeat(" + puzzle.cols + ", var(--cell))";

        var grid = [];
        for (var r = 0; r < puzzle.rows; r++) {
          grid[r] = [];
          for (var c = 0; c < puzzle.cols; c++) {
            grid[r][c] = null;
          }
        }

        var cellMap = new Map();
        var selectedWordId = puzzle.words[0].id;

        function key(row, col) {
          return row + "-" + col;
        }

        function normalizeChar(char) {
          return (char || "")
            .toLocaleUpperCase("da-DK")
            .replace(/[^A-ZÆØÅ]/g, "");
        }

        function getLetterCount(answer) {
          return answer.replace(/\s/g, "").length;
        }

        function getWordCount(answer) {
          return answer.trim().split(/\s+/).length;
        }

        function addWordToGrid(word) {
          var letters = word.answer.split("");

          for (var index = 0; index < letters.length; index++) {
            var letter = letters[index];
            var row = word.dir === "across" ? word.row : word.row + index;
            var col = word.dir === "across" ? word.col + index : word.col;

            if (row < 1 || row > puzzle.rows || col < 1 || col > puzzle.cols) {
              throw new Error("Ordet " + word.answer + " ligger uden for gitteret.");
            }

            var existing = grid[row - 1][col - 1];

            if (letter === " ") {
              if (existing && !existing.isSeparator) {
                throw new Error("Mellemrumskonflikt ved " + row + "," + col);
              }
              if (!existing) {
                grid[row - 1][col - 1] = {
                  letter: " ",
                  isSeparator: true,
                  words: [],
                  number: null
                };
              }
              continue;
            }

            if (existing && existing.letter !== letter) {
              throw new Error("Bogstavkonflikt ved " + row + "," + col + ": " + existing.letter + " / " + letter);
            }

            if (!existing) {
              grid[row - 1][col - 1] = {
                letter: letter,
                isSeparator: false,
                words: [word.id],
                number: null
              };
            } else {
              if (existing.words.indexOf(word.id) === -1) {
                existing.words.push(word.id);
              }
            }
          }
        }

        try {
          for (var wi = 0; wi < puzzle.words.length; wi++) {
            addWordToGrid(puzzle.words[wi]);
          }
        } catch (err) {
          status.textContent = (err && err.message) || "Kryds og tværs kunne ikke bygges.";
          return;
        }

        for (var wj = 0; wj < puzzle.words.length; wj++) {
          var w = puzzle.words[wj];
          var startCell = grid[w.row - 1][w.col - 1];
          if (startCell && startCell.number === null) {
            startCell.number = w.id;
          }
        }

        function qs(sel) {
          return app.querySelector(sel);
        }

        function qsa(sel) {
          return app.querySelectorAll(sel);
        }

        function getWordPathCells(word) {
          var out = [];
          for (var i = 0; i < word.answer.length; i++) {
            var row = word.dir === "across" ? word.row : word.row + i;
            var col = word.dir === "across" ? word.col + i : word.col;
            var cellEl = qs('[data-row="' + row + '"][data-col="' + col + '"]');
            out.push(cellEl);
          }
          return out;
        }

        function getWordCells(word) {
          return getWordPathCells(word).filter(function (cell) {
            return !!cell;
          });
        }

        function getWordById(id) {
          for (var i = 0; i < puzzle.words.length; i++) {
            if (puzzle.words[i].id === id) return puzzle.words[i];
          }
          return null;
        }

        function getCellWordIds(row, col) {
          var data = grid[row - 1][col - 1];
          return data && !data.isSeparator ? data.words : [];
        }

        function getInputValue(el) {
          return normalizeChar(el.value);
        }

        function isWordCorrect(word) {
          var cells = getWordCells(word);
          var answerLetters = word.answer.replace(/\s/g, "").split("");

          for (var i = 0; i < cells.length; i++) {
            if (!cells[i] || getInputValue(cells[i]) !== answerLetters[i]) return false;
          }

          return true;
        }

        function updateWordStates() {
          qsa(".cell-wrap").forEach(function (wrap) {
            wrap.classList.remove("correct");
          });

          qsa(".clue-item").forEach(function (item) {
            item.classList.remove("correct");
          });

          var solved = 0;

          puzzle.words.forEach(function (word) {
            var correct = isWordCorrect(word);
            if (correct) {
              solved += 1;
              getWordCells(word).forEach(function (cell) {
                if (cell && cell.parentElement) cell.parentElement.classList.add("correct");
              });
              var clueItem = qs('[data-clue-id="' + word.id + '"]');
              if (clueItem) clueItem.classList.add("correct");
            }
          });

          if (solved === puzzle.words.length) {
            app.classList.add("crossword-app--solved");
            status.textContent = "Flot! Du har løst hele kryds og tværsen.";
          } else {
            app.classList.remove("crossword-app--solved");
            if (solved > 0) {
              status.textContent = "Du har " + solved + " rigtige ord.";
            } else {
              status.textContent = "";
            }
          }
        }

        function clearWordHighlight() {
          qsa(".cell-wrap").forEach(function (wrap) {
            wrap.classList.remove("word-active", "active-cell");
          });
        }

        function highlightSelectedWord(activeCell) {
          clearWordHighlight();

          var word = getWordById(selectedWordId);
          if (word) {
            getWordCells(word).forEach(function (cell) {
              if (cell && cell.parentElement) cell.parentElement.classList.add("word-active");
            });
          }

          if (activeCell && activeCell.parentElement) {
            activeCell.parentElement.classList.add("active-cell");
          }
        }

        function focusWordStart(wordId) {
          selectedWordId = wordId;
          var word = getWordById(wordId);
          if (!word) return;

          var firstPlayable = getWordCells(word)[0];
          if (firstPlayable) {
            firstPlayable.focus();
            highlightSelectedWord(firstPlayable);
          }
        }

        function getNextCellInWord(wordId, row, col) {
          var word = getWordById(wordId);
          if (!word) return null;

          var cells = getWordCells(word);
          var currentIndex = -1;
          for (var i = 0; i < cells.length; i++) {
            if (
              cells[i] &&
              Number(cells[i].dataset.row) === row &&
              Number(cells[i].dataset.col) === col
            ) {
              currentIndex = i;
              break;
            }
          }

          if (currentIndex === -1) return null;
          return cells[currentIndex + 1] || null;
        }

        function getPreviousCellInWord(wordId, row, col) {
          var word = getWordById(wordId);
          if (!word) return null;

          var cells = getWordCells(word);
          var currentIndex = -1;
          for (var i = 0; i < cells.length; i++) {
            if (
              cells[i] &&
              Number(cells[i].dataset.row) === row &&
              Number(cells[i].dataset.col) === col
            ) {
              currentIndex = i;
              break;
            }
          }

          if (currentIndex === -1) return null;
          return cells[currentIndex - 1] || null;
        }

        function moveDirectional(row, col, deltaRow, deltaCol) {
          var r = row + deltaRow;
          var c = col + deltaCol;

          while (r >= 1 && r <= puzzle.rows && c >= 1 && c <= puzzle.cols) {
            var candidate = qs('[data-row="' + r + '"][data-col="' + c + '"]');
            if (candidate) {
              candidate.focus();
              var ids = getCellWordIds(r, c);
              if (ids.indexOf(selectedWordId) !== -1) {
                highlightSelectedWord(candidate);
              } else if (ids.length) {
                selectedWordId = ids[0];
                highlightSelectedWord(candidate);
              }
              return;
            }
            r += deltaRow;
            c += deltaCol;
          }
        }

        function clearSelectedWord() {
          var word = getWordById(selectedWordId);
          if (!word) return;
          getWordCells(word).forEach(function (cell) {
            if (cell) cell.value = "";
          });
          updateWordStates();
          focusWordStart(word.id);
        }

        function clearAll() {
          qsa(".cell").forEach(function (cell) {
            cell.value = "";
          });
          updateWordStates();
          focusWordStart(puzzle.words[0].id);
        }

        function createBoard() {
          for (var row = 1; row <= puzzle.rows; row++) {
            for (var col = 1; col <= puzzle.cols; col++) {
              var data = grid[row - 1][col - 1];
              var wrap = document.createElement("div");
              wrap.className = "cell-wrap";

              if (!data) {
                wrap.classList.add("block");
                board.appendChild(wrap);
                continue;
              }

              if (data.number !== null) {
                var number = document.createElement("span");
                number.className = "cell-number";
                number.textContent = data.number;
                wrap.appendChild(number);
              }

              if (data.isSeparator) {
                wrap.classList.add("separator");
                wrap.setAttribute("aria-hidden", "true");
                board.appendChild(wrap);
                continue;
              }

              var input = document.createElement("input");
              input.className = "cell";
              input.type = "text";
              input.inputMode = "text";
              input.maxLength = 1;
              input.setAttribute("aria-label", "Felt række " + row + ", kolonne " + col);
              input.dataset.row = row;
              input.dataset.col = col;
              input.dataset.words = data.words.join(",");
              wrap.appendChild(input);

              cellMap.set(key(row, col), input);
              board.appendChild(wrap);

              input.addEventListener("focus", function (d, inp) {
                return function () {
                  var wordIds = d.words;
                  if (wordIds.indexOf(selectedWordId) === -1) {
                    selectedWordId = wordIds[0];
                  }
                  highlightSelectedWord(inp);
                };
              }(data, input));

              input.addEventListener("click", function (d, inp) {
                return function () {
                  var wordIds = d.words;
                  if (wordIds.length > 1) {
                    var currentIndex = wordIds.indexOf(selectedWordId);
                    selectedWordId = wordIds[(currentIndex + 1) % wordIds.length];
                  } else {
                    selectedWordId = wordIds[0];
                  }
                  highlightSelectedWord(inp);
                };
              }(data, input));

              input.addEventListener("input", function (inp) {
                return function () {
                  inp.value = normalizeChar(inp.value);
                  updateWordStates();

                  if (inp.value) {
                    var next = getNextCellInWord(
                      selectedWordId,
                      Number(inp.dataset.row),
                      Number(inp.dataset.col)
                    );
                    if (next) {
                      next.focus();
                      highlightSelectedWord(next);
                    } else {
                      highlightSelectedWord(inp);
                    }
                  }
                };
              }(input));

              input.addEventListener("keydown", function (inp) {
                return function (event) {
                  var row = Number(inp.dataset.row);
                  var col = Number(inp.dataset.col);

                  if (event.key === "Backspace") {
                    event.preventDefault();
                    if (inp.value) {
                      inp.value = "";
                      updateWordStates();
                      highlightSelectedWord(inp);
                    } else {
                      var prev = getPreviousCellInWord(selectedWordId, row, col);
                      if (prev) {
                        prev.value = "";
                        prev.focus();
                        updateWordStates();
                        highlightSelectedWord(prev);
                      }
                    }
                    return;
                  }

                  if (event.key === "Delete") {
                    event.preventDefault();
                    inp.value = "";
                    updateWordStates();
                    highlightSelectedWord(inp);
                    return;
                  }

                  if (event.key === "ArrowRight") {
                    event.preventDefault();
                    moveDirectional(row, col, 0, 1);
                    return;
                  }

                  if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    moveDirectional(row, col, 0, -1);
                    return;
                  }

                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    moveDirectional(row, col, 1, 0);
                    return;
                  }

                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    moveDirectional(row, col, -1, 0);
                    return;
                  }

                  if (event.key === " ") {
                    event.preventDefault();
                    var ids = getCellWordIds(row, col);
                    if (ids.length > 1) {
                      var currentIndex = ids.indexOf(selectedWordId);
                      selectedWordId = ids[(currentIndex + 1) % ids.length];
                      highlightSelectedWord(inp);
                    }
                  }
                };
              }(input));
            }
          }
        }

        function createClues() {
          puzzle.words.forEach(function (word) {
            var item = document.createElement("li");
            item.className = "clue-item";
            item.dataset.clueId = String(word.id);

            var head = document.createElement("div");
            head.className = "clue-head";

            var textBox = document.createElement("div");

            var titleRow = document.createElement("div");
            titleRow.className = "clue-title-row";

            var clueAudioBtn = document.createElement("button");
            clueAudioBtn.type = "button";
            clueAudioBtn.className = "crossword-audio-btn crossword-audio-btn--compact";
            clueAudioBtn.setAttribute("data-audio", CW_AUDIO.clueFile(word.id));
            clueAudioBtn.setAttribute("aria-label", "Afspil oplæsning af tip " + word.id);
            var clueSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            clueSvg.setAttribute("class", "crossword-audio-btn__svg");
            clueSvg.setAttribute("width", "18");
            clueSvg.setAttribute("height", "18");
            clueSvg.setAttribute("viewBox", "0 0 24 24");
            clueSvg.setAttribute("aria-hidden", "true");
            var clueUse = document.createElementNS("http://www.w3.org/2000/svg", "use");
            clueUse.setAttribute("href", "#icon-speaker");
            clueSvg.appendChild(clueUse);
            clueAudioBtn.appendChild(clueSvg);

            var title = document.createElement("p");
            title.className = "clue-title";

            var wordCount = getWordCount(word.answer);
            var letterCount = getLetterCount(word.answer);
            var fieldCount = word.answer.length;

            if (wordCount > 1) {
              title.textContent =
                word.id +
                ". " +
                (word.dir === "across" ? "Vandret" : "Lodret") +
                " · " +
                fieldCount +
                " felter · " +
                wordCount +
                " ord";
            } else {
              title.textContent =
                word.id +
                ". " +
                (word.dir === "across" ? "Vandret" : "Lodret") +
                " · " +
                letterCount +
                " bogstaver";
            }

            titleRow.appendChild(clueAudioBtn);
            titleRow.appendChild(title);

            var meta = document.createElement("p");
            meta.className = "clue-meta";
            meta.textContent = "Start: række " + word.row + ", kolonne " + word.col;

            var clue = document.createElement("p");
            clue.className = "clue-text";
            clue.textContent = word.clue;

            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "clue-btn crossword-btn";
            btn.textContent = "Gå til ord";
            btn.addEventListener("click", function (wid) {
              return function () {
                focusWordStart(wid);
              };
            }(word.id));

            textBox.appendChild(titleRow);
            textBox.appendChild(meta);
            textBox.appendChild(clue);

            head.appendChild(textBox);
            head.appendChild(btn);
            item.appendChild(head);
            clueList.appendChild(item);
          });
        }

        clearSelectedBtn.addEventListener("click", clearSelectedWord);
        clearAllBtn.addEventListener("click", clearAll);

        createBoard();
        createClues();
        cwArticle.addEventListener("click", onCwAudioClick);
        cwArticle.querySelectorAll(".crossword-audio-btn").forEach(ensureCwAudioButtonIcons);
        focusWordStart(puzzle.words[0].id);
        updateWordStates();
      })();
    
