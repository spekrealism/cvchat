<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  
  // Параметры боковой панели
  export let sidebarWidth = '20%';
  // export let sidebarBackgroundColor = '#e0f7fa';
  export let sidebarBackgroundColor = '#2c3e50';
  export let sidebarHeight = '100vh';
  
  // Список слов, которые будем искать на поле
  export let words: string[] = ['DEV', 'CODE', 'APP', 'WEB', 'STACK', 'CSS', 'HTML', 'JS', 'API'];
  
  // Размеры поля
  export let rows = 20; // Увеличиваем количество строк для большей высоты
  export let cols = 10;
  
  // Вероятность начала нового слова при обновлении
  export let newWordChance = 0.1;
  
  // Вероятность продолжения слова, если рядом уже есть буква
  export let wordContinuationChance = 0.7;
  
  // Символы, которые могут появиться на поле
  const symbols = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789πe∂◻◫▥▣◼.:-=+*#%@';
  
  // Максимальный размер кэша (1MB в байтах)
  const MAX_CACHE_SIZE = 512;
  
  // Состояние поля: двумерный массив символов
  let grid: string[][] = [];
  
  // Состояние подсветки: координаты и направление найденных слов
  type WordHighlight = {
    word: string;
    coords: {row: number, col: number}[];
    direction: string;
  };
  let highlights: WordHighlight[] = [];
  
  $: {
    if (rows > 0 && cols > 0) {
      initializeGrid();
      findWords();
    }
  }

  // Слова в процессе формирования
  type GrowingWord = {
    word: string;            // Само слово
    currentIndex: number;    // Индекс следующей буквы для размещения
    startRow: number;        // Начальная позиция
    startCol: number;        // Начальная позиция
    direction: {             // Направление роста
      rowStep: number;
      colStep: number;
      name: string;
    };
  };
  let growingWords: GrowingWord[] = [];
  
  // История для ограничения кэша
  type GridHistory = {
    timestamp: number;
    grid: string[][];
  };
  let gridHistory: GridHistory[] = [];
  
  // Текущий размер кэша в байтах
  let currentCacheSize = 0;
  
  // Отладочная информация
  let debugInfo = {
    lastPlacedWord: '',
    lastPlacedLetter: '',
    totalWordsPlaced: 0,
    growingWordsCount: 0,
    highlightedWords: 0,
    cacheSize: '0 KB'
  };
  
  // Интервал обновления поля в миллисекундах
  const updateInterval = 100;
  let intervalId: ReturnType<typeof setInterval> | undefined;
  
  // Флаг для управления остановкой/запуском поиска
  let isSearchRunning = false;
  
  // Функция для измерения размера объекта (приблизительно)
  function getObjectSize(obj: any): number {
    const jsonString = JSON.stringify(obj);
    return new TextEncoder().encode(jsonString).length;
  }
  
  // Обновление текущего размера кэша
  function updateCacheSize(): void {
    if (!grid || grid.length === 0) return;
    const gridSize = getObjectSize(grid);
    const highlightsSize = getObjectSize(highlights);
    const historySize = getObjectSize(gridHistory);
    const growingWordsSize = getObjectSize(growingWords);
    
    currentCacheSize = gridSize + highlightsSize + historySize + growingWordsSize;
    
    // Обновляем информацию в отладочной панели
    const sizeInKB = (currentCacheSize / 1024).toFixed(2);
    debugInfo.cacheSize = `${sizeInKB} KB`;
    debugInfo.growingWordsCount = growingWords.length;
    
    // Если размер кэша превышает максимальный, удаляем старые данные
    if (currentCacheSize > MAX_CACHE_SIZE) {
      trimCache();
    }
  }
  
  // Удаление старых данных при превышении лимита кэша
  function trimCache(): void {
    // Удаляем самые старые элементы из истории
    while (currentCacheSize > MAX_CACHE_SIZE * 0.8 && gridHistory.length > 0) {
      gridHistory.shift(); // Удаляем самый старый элемент
      
      // Пересчитываем размер кэша
      updateCacheSize();
    }
  }
  
  // Проверка, может ли слово начаться с данной позиции в данном направлении
  function canStartWord(word: string, row: number, col: number, rowStep: number, colStep: number): boolean {
    // Проверяем, что слово помещается в границы поля
    if (row + rowStep * (word.length - 1) >= rows || row + rowStep * (word.length - 1) < 0) return false;
    if (col + colStep * (word.length - 1) >= cols || col + colStep * (word.length - 1) < 0) return false;
    
    return true;
  }
  
  // Проверка, можно ли продолжить слово в данном направлении
  function canContinueWord(growingWord: GrowingWord): boolean {
    const { word, currentIndex, startRow, startCol, direction } = growingWord;
    
    // Если слово уже полностью размещено
    if (currentIndex >= word.length) return false;
    
    // Вычисляем позицию следующей буквы
    const nextRow = startRow + currentIndex * direction.rowStep;
    const nextCol = startCol + currentIndex * direction.colStep;
    
    // Проверяем, что следующая позиция в границах поля
    if (nextRow < 0 || nextRow >= rows || nextCol < 0 || nextCol >= cols) return false;
    
    return true;
  }
  
  // Начать новое слово в случайной позиции
  function startNewWord(): boolean {
    if (words.length === 0) return false;
    
    // Выбираем случайное слово
    const wordIndex = Math.floor(Math.random() * words.length);
    const word = words[wordIndex];
    
    // Направления для размещения: горизонтально, вертикально, диагонально
    const directions = [
      {name: 'horizontal', rowStep: 0, colStep: 1},
      {name: 'vertical', rowStep: 1, colStep: 0},
      {name: 'diagonal-right', rowStep: 1, colStep: 1},
      {name: 'diagonal-left', rowStep: 1, colStep: -1}
    ];
    
    // Перемешиваем направления для случайного выбора
    const shuffledDirections = [...directions].sort(() => Math.random() - 0.5);
    
    // Пытаемся разместить первую букву слова в случайном направлении
    for (const dir of shuffledDirections) {
      // Определяем максимальные допустимые координаты для начала слова
      const maxRow = rows - 1 - Math.max(0, (word.length - 1) * dir.rowStep);
      const maxCol = cols - 1 - Math.max(0, (word.length - 1) * dir.colStep);
      const minCol = Math.max(0, -1 * (word.length - 1) * dir.colStep);
      
      // Проверяем, что слово вообще можно разместить в этом направлении
      if (maxRow < 0 || maxCol < minCol) continue;
      
      // Выбираем случайную начальную позицию
      const startRow = Math.floor(Math.random() * (maxRow + 1));
      const startCol = Math.min(maxCol, Math.max(minCol, Math.floor(Math.random() * (maxCol - minCol + 1) + minCol)));
      
      // Проверяем, что можно начать слово с этой позиции
      if (canStartWord(word, startRow, startCol, dir.rowStep, dir.colStep)) {
        // Размещаем первую букву слова
        grid[startRow][startCol] = word[0];
        
        // Добавляем слово в список растущих
        growingWords.push({
          word,
          currentIndex: 1, // Следующая буква для размещения (вторая)
          startRow,
          startCol,
          direction: {
            rowStep: dir.rowStep,
            colStep: dir.colStep,
            name: dir.name
          }
        });
        
        debugInfo.lastPlacedWord = word;
        debugInfo.lastPlacedLetter = word[0];
        
        // Сохраняем состояние сетки
        saveGridState();
        
        return true;
      }
    }
    
    return false; // Не удалось начать новое слово
  }
  
  // Продолжаем рост существующих слов
  function continueGrowingWords(): boolean {
    if (growingWords.length === 0) return false;
    
    // Выбираем случайное растущее слово
    const index = Math.floor(Math.random() * growingWords.length);
    const growingWord = growingWords[index];
    
    // Проверяем, можно ли продолжить это слово
    if (canContinueWord(growingWord)) {
      // Вычисляем позицию следующей буквы
      const nextRow = growingWord.startRow + growingWord.currentIndex * growingWord.direction.rowStep;
      const nextCol = growingWord.startCol + growingWord.currentIndex * growingWord.direction.colStep;
      
      // Размещаем следующую букву
      const nextLetter = growingWord.word[growingWord.currentIndex];
      grid[nextRow][nextCol] = nextLetter;
      
      debugInfo.lastPlacedLetter = nextLetter;
      
      // Увеличиваем индекс текущей буквы
      growingWord.currentIndex++;
      
      // Если все буквы размещены, увеличиваем счетчик и удаляем из списка растущих
      if (growingWord.currentIndex >= growingWord.word.length) {
        debugInfo.totalWordsPlaced++;
        growingWords.splice(index, 1);
      }
      
      // Сохраняем состояние сетки
      saveGridState();
      
      return true;
    } else {
      // Если не можем продолжить, удаляем из списка растущих
      growingWords.splice(index, 1);
      return false;
    }
  }
  
  // Сохранение текущего состояния сетки в историю
  function saveGridState(): void {
    // Создаем глубокую копию сетки
    const gridCopy = grid.map(row => [...row]);
    
    // Добавляем в историю
    gridHistory.push({
      timestamp: Date.now(),
      grid: gridCopy
    });
    
    // Обновляем размер кэша
    updateCacheSize();
  }
  
  // Обновление случайных клеток
  function updateRandomCells() {
    // Сначала пробуем продолжить существующие слова
    if (growingWords.length > 0 && Math.random() < wordContinuationChance) {
      if (continueGrowingWords()) {
        grid = [...grid]; // Обновляем реактивность
        findWords();
        return;
      }
    }
    
    // Затем пытаемся начать новое слово с определенной вероятностью
    if (Math.random() < newWordChance) {
      if (startNewWord()) {
        grid = [...grid]; // Обновляем реактивность
        findWords();
        return;
      }
    }
    
    // В остальных случаях обновляем случайные клетки
    const numCellsToUpdate = Math.floor(Math.random() * 3) + 1; // От 1 до 3 клеток
    
    for (let i = 0; i < numCellsToUpdate; i++) {
      const row = Math.floor(Math.random() * rows);
      const col = Math.floor(Math.random() * cols);
      
      // 30% вероятность пустой клетки
      if (Math.random() < 0.3) {
        grid[row][col] = '';
      } else {
        const randomIndex = Math.floor(Math.random() * symbols.length);
        grid[row][col] = symbols[randomIndex];
      }
    }
    
    grid = [...grid]; // Обновляем реактивность
    saveGridState();
    findWords();
  }
  
  // Инициализация поля случайными символами
  function initializeGrid() {
    // Заполняем поле случайными символами
    grid = Array(rows).fill(null).map(() => Array(cols).fill(''));
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        // 30% вероятность пустой клетки
        if (Math.random() < 0.3) {
          grid[i][j] = '';
        } else {
          const randomIndex = Math.floor(Math.random() * symbols.length);
          grid[i][j] = symbols[randomIndex];
        }
      }
    }
    
    // Начинаем несколько слов (до 3)
    for (let i = 0; i < 3; i++) {
      startNewWord();
    }
    
    grid = [...grid]; // Обновляем реактивность
    saveGridState();
    findWords();
  }
  
  // Проверка, можно ли найти целое слово с данной позиции
  function canPlaceWord(word: string, row: number, col: number, rowStep: number, colStep: number): boolean {
    // Проверяем, что слово помещается в границы поля
    if (row + rowStep * (word.length - 1) >= rows || row + rowStep * (word.length - 1) < 0) return false;
    if (col + colStep * (word.length - 1) >= cols || col + colStep * (word.length - 1) < 0) return false;
    
    // Проверяем каждую букву слова
    for (let i = 0; i < word.length; i++) {
      const r = row + i * rowStep;
      const c = col + i * colStep;
      
      // Проверяем, что клетка существует и содержит нужную букву
      if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] !== word[i]) {
        return false;
      }
    }
    
    return true;
  }
  
  // Поиск слов на поле
  function findWords() {
    if (!grid || grid.length === 0) return;
    highlights = [];
    
    // Направления для поиска: горизонтально, вертикально, диагонально
    const directions = [
      {name: 'horizontal', rowStep: 0, colStep: 1},
      {name: 'vertical', rowStep: 1, colStep: 0},
      {name: 'diagonal-right', rowStep: 1, colStep: 1},
      {name: 'diagonal-left', rowStep: 1, colStep: -1}
    ];
    
    words.forEach(word => {
      directions.forEach(dir => {
        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < cols; j++) {
            // Проверяем, можно ли найти слово с этой позиции
            if (canPlaceWord(word, i, j, dir.rowStep, dir.colStep)) {
              const coords = [];
              for (let k = 0; k < word.length; k++) {
                coords.push({
                  row: i + k * dir.rowStep,
                  col: j + k * dir.colStep
                });
              }
              
              highlights.push({
                word,
                coords,
                direction: dir.name
              });
            }
          }
        }
      });
    });
    
    debugInfo.highlightedWords = highlights.length;
    updateCacheSize();
  }
  
  // Определяем, подсвечена ли данная клетка
  function isHighlighted(row: number, col: number) {
    for (const highlight of highlights) {
      for (const coord of highlight.coords) {
        if (coord.row === row && coord.col === col) {
          return true;
        }
      }
    }
    return false;
  }
  
  // Получаем цвет для подсветки в зависимости от слова
  function getHighlightColor(row: number, col: number) {
    for (const highlight of highlights) {
      for (const coord of highlight.coords) {
        if (coord.row === row && coord.col === col) {
          // Хэшируем слово для получения разных цветов
          const hash = highlight.word.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
          }, 0);
          return `hsl(${Math.abs(hash) % 360}, 100%, 80%)`;
        }
      }
    }
    return 'transparent';
  }
  
  // Получаем найденное слово для клетки (для отладки)
  function getHighlightWord(row: number, col: number) {
    for (const highlight of highlights) {
      for (const coord of highlight.coords) {
        if (coord.row === row && coord.col === col) {
          return highlight.word;
        }
      }
    }
    return '';
  }
  
  // Очистка кэша - сброс сетки и найденных слов
  function clearCache() {
    // Очищаем сетку
    grid = Array(rows).fill(null).map(() => Array(cols).fill(''));
    // Сбрасываем подсветку слов
    highlights = [];
    // Очищаем список растущих слов
    growingWords = [];
    // Очищаем историю
    gridHistory = [];
    // Сбрасываем отладочную информацию
    debugInfo = {
      lastPlacedWord: '',
      lastPlacedLetter: '',
      totalWordsPlaced: 0,
      growingWordsCount: 0,
      highlightedWords: 0,
      cacheSize: '0 KB'
    };
    // Обновляем сетку
    grid = [...grid];
    // Обновляем размер кэша
    updateCacheSize();
  }
  
  // Остановка/запуск поиска
  function toggleSearch() {
    if (isSearchRunning) {
      // Останавливаем поиск
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
      isSearchRunning = false;
      console.log('Поиск остановлен');
    } else {
      // Запускаем поиск
      intervalId = setInterval(() => {
        updateRandomCells();
      }, updateInterval);
      isSearchRunning = true;
      console.log('Поиск запущен');
    }
  }
  
  onMount(() => {
    // initializeGrid();
    // findWords();

    // Запускаем интервал для периодического обновления поля
    intervalId = setInterval(() => {
      updateRandomCells();
    }, updateInterval);
    
    isSearchRunning = true;
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  });
  
  onDestroy(() => {
    if (intervalId) clearInterval(intervalId);
  });
</script>

<style>
  /* Стили для боковой панели */
  .sidebar-container {
    position: relative;
    height: 100%;
    width: 100%;
    margin: 0 auto;
    overflow: hidden;
    box-sizing: border-box;
  }

  .sidebar {
    width: 100%;
    color: #fff;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
    box-sizing: border-box;
  }

  .sidebar-content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    width: 100%;
    box-sizing: border-box;
  }

  /* Стили для игрового поля */
  .grid-container {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
    width: 100%;
    margin: 0 auto;
    font-family: monospace;
    line-height: 1;
    overflow: hidden; /* Меняем overflow-y: auto на overflow: hidden */
  }
  
  .grid-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
  }

  .grid-row:last-of-type {
    margin-bottom: 0;
  }
  
  .grid-cell {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 5px;
    font-size: 18px;
    transition: all 0.3s ease;
    position: relative;
    border-radius: 4px;
  }
  
  @keyframes pulse {
    0% { transform: scale(1); box-shadow: 0 0 5px rgba(255, 255, 255, 0.5); }
    50% { transform: scale(1.2); box-shadow: 0 0 15px rgba(255, 255, 255, 0.9); }
    100% { transform: scale(1); box-shadow: 0 0 5px rgba(255, 255, 255, 0.5); }
  }
  
  .grid-cell.highlighted {
    color: #000;
    font-weight: bold;
    font-size: 20px;
    text-shadow: 0 0 5px rgba(255, 255, 255, 1);
    border: 2px solid rgba(0, 0, 0, 0.9);
    box-shadow: 0 0 12px rgba(255, 255, 255, 0.8);
    z-index: 2;
    animation: pulse 1s infinite;
  }
  
  .grid-separator {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
  }

  .grid-separator:last-of-type {
    margin-bottom: 0;
  }
  
  .horizontal-line {
    width: 30px;
    height: 1px;
    margin-right: 5px;
  }
  
  .debug-panel {
    font-size: 12px;
    margin-top: 10px;
    padding: 10px;
    background-color: rgba(0, 0, 0, 0.1);
    border-radius: 4px;
  }
  
  .tooltip {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 2px 5px;
    border-radius: 4px;
    font-size: 10px;
    white-space: nowrap;
    z-index: 10;
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: none;
  }
  
  .grid-cell:hover .tooltip {
    opacity: 1;
  }
  
  .controls {
    display: flex;
    gap: 10px;
    margin-top: 10px;
  }
  
  button {
    padding: 8px 12px;
    background-color: #444;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  button:hover {
    background-color: #666;
  }
  
  button:active {
    background-color: #222;
  }
</style>

<div class="sidebar-container" style="width: {sidebarWidth}; background-color: {sidebarBackgroundColor}; height: {sidebarHeight};">
  <div class="sidebar">
    <div class="sidebar-content">
      <div class="grid-container">
        {#each Array(rows) as _, rowIndex}
          <!-- Верхние разделители строк (только для первой строки) -->
          {#if rowIndex === 0}
            <div class="grid-separator">
              {#each Array(cols) as _, colIndex}
                <div class="horizontal-line"></div>
              {/each}
            </div>
          {/if}
          
          <!-- Строка с ячейками -->
          <div class="grid-row">
            {#each Array(cols) as _, colIndex}
              <div 
                class="grid-cell" 
                class:highlighted={isHighlighted(rowIndex, colIndex)}
                style="background-color: {getHighlightColor(rowIndex, colIndex)};"
              >
                {grid[rowIndex][colIndex]}
                {#if isHighlighted(rowIndex, colIndex)}
                  <div class="tooltip">Слово: {getHighlightWord(rowIndex, colIndex)}</div>
                {/if}
              </div>
            {/each}
          </div>
          
          <!-- Нижние разделители строк -->
          <div class="grid-separator">
            {#each Array(cols) as _, colIndex}
              <div class="horizontal-line"></div>
            {/each}
          </div>
        {/each}
        
        <!-- Управление анимацией -->
        <!-- <div class="controls">
          <button on:click={clearCache}>Очистить кэш</button>
          <button on:click={toggleSearch}>{isSearchRunning ? 'Остановить поиск' : 'Запустить поиск'}</button>
        </div> -->
        
        <!-- Отладочная панель -->
        <!-- <div class="debug-panel">
          <div>Последнее размещенное слово: {debugInfo.lastPlacedWord}</div>
          <div>Последняя размещенная буква: {debugInfo.lastPlacedLetter}</div>
          <div>Слов в процессе формирования: {debugInfo.growingWordsCount}</div>
          <div>Завершенных слов: {debugInfo.totalWordsPlaced}</div>
          <div>Найдено и подсвечено слов: {debugInfo.highlightedWords}</div>
          <div>Размер кэша: {debugInfo.cacheSize}</div>
          <div>Статус поиска: {isSearchRunning ? 'Запущен' : 'Остановлен'}</div>
        </div> -->
      </div>
    </div>
  </div>
</div>
