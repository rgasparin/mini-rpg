const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const tileSize = 32;
const viewWidth = canvas.width / tileSize;
const viewHeight = canvas.height / tileSize;

// Mapa simples: 0 = chão, 1 = parede
const mapWidth = 50;
const mapHeight = 30;
const map = Array.from({ length: mapHeight }, () =>
    Array.from({ length: mapWidth }, () => Math.random() < 0.2 ? 1 : 0)
);

let numEnemies = 10;
const enemies = [];

let currentStage = 1;

const player = {
    x: Math.floor(mapWidth / 2),
    y: Math.floor(mapHeight / 2),
    color: 'blue',
    hp: 5,
    maxHp: 5,
    mp: 3,
    maxMp: 5,
    xp: 0,
    level: 1,
    xpToNextLevel: 10

};

const items = [];
const inventorySlots = 6;
const inventory = Array(inventorySlots).fill(null); // [null, null, ...]





let magicEffects = [];

function nextStage() {
    currentStage++;
    console.log(`🚪 Indo para o nível ${currentStage}...`);

    // Regenera mapa
    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            map[y][x] = Math.random() < 0.2 ? 1 : 0;
        }
    }

    // Reposiciona jogador
    player.x = Math.floor(mapWidth / 2);
    player.y = Math.floor(mapHeight / 2);

    // Regenera inimigos e itens
    enemies.length = 0;
    items.length = 0;
    spawnEnemies();

    // Aumenta dificuldade
    player.hp = player.maxHp;
    player.mp = player.maxMp;
    numEnemies += 2;

    render();
}


function drawItems() {
    items.forEach(item => {
        const { offsetX, offsetY } = getCameraOffset();
        const screenX = (item.x - offsetX) * tileSize;
        const screenY = (item.y - offsetY) * tileSize;

        if (
            item.x >= offsetX && item.x < offsetX + viewWidth &&
            item.y >= offsetY && item.y < offsetY + viewHeight
        ) {
            ctx.fillStyle = item.type === 'hp' ? 'green' : 'blue';
            ctx.beginPath();
            ctx.arc(screenX + tileSize / 2, screenY + tileSize / 2, tileSize / 4, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function updateBars() {
  const hpRatio = player.hp / player.maxHp;
  const mpRatio = player.mp / player.maxMp;

  document.querySelector('.fill.hp').style.width = `${hpRatio * 100}%`;
  document.querySelector('.fill.mp').style.width = `${mpRatio * 100}%`;
}

function drawPlayer() {
    ctx.drawImage(playerSprite, player.x * tileSize, player.y * tileSize, tileSize, tileSize);
}

function drawEnemies() {
    enemies.forEach(enemy => {
        ctx.drawImage(enemySprite, enemy.x * tileSize, enemy.y * tileSize, tileSize, tileSize);
    });
}


function checkEnemyCollision() {
    enemies.forEach(enemy => {
        const dx = Math.abs(enemy.x - player.x);
        const dy = Math.abs(enemy.y - player.y);

        if ((dx === 0 && dy === 0) || (dx + dy === 1)) {
            // Inimigo encostou ou está ao lado
            player.hp -= 1;
            console.log(`⚔️ Dano! Vida restante: ${player.hp}`);
        }
    });

    if (player.hp <= 0) {
        alert("💀 Você morreu!");
        location.reload(); // reinicia o jogo
    }
}

function castMagic() {
    if (player.mp <= 0) {
        console.log("❌ Sem mana suficiente!");
        return;
    }

    player.mp -= 1;

    const directions = [
        { dx: 0, dy: -2 },
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: 2 },
        { dx: -1, dy: 0 },
        { dx: -2, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: 2, dy: 0 }
    ];

    directions.forEach(dir => {
        const targetX = player.x + dir.dx;
        const targetY = player.y + dir.dy;

        // Salva a célula atingida para efeito visual
        magicEffects.push({ x: targetX, y: targetY });

        // Remove inimigo se estiver na célula
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            if (enemy.x === targetX && enemy.y === targetY) {
                enemy.hit = true;
                setTimeout(() => {
                    enemies.splice(i, 1);
                    player.xp += 5;
                    dropItem(enemy.x, enemy.y); // chance de drop
                    render();
                    if (enemies.length === 0) {
                        nextStage();
                    }
                }, 200);
                break;
            }
        }
    });

    // Limpa os efeitos após 300ms
    setTimeout(() => {
        magicEffects = [];
        render();
    }, 300);

    console.log("✨ Magia lançada! Mana restante:", player.mp);
    
    checkLevelUp();
    render();
}


function getCameraOffset() {
    let offsetX = player.x - Math.floor(viewWidth / 2);
    let offsetY = player.y - Math.floor(viewHeight / 2);

    offsetX = Math.max(0, Math.min(offsetX, mapWidth - viewWidth));
    offsetY = Math.max(0, Math.min(offsetY, mapHeight - viewHeight));

    return { offsetX, offsetY };
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const { offsetX, offsetY } = getCameraOffset();

    for (let y = 0; y < viewHeight; y++) {
        for (let x = 0; x < viewWidth; x++) {
            const mapX = x + offsetX;
            const mapY = y + offsetY;
            const tile = map[mapY]?.[mapX] ?? 0;

            ctx.fillStyle = tile === 1 ? '#444' : '#ccc';
            ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        }
    }

    magicEffects.forEach(effect => {
        const { offsetX, offsetY } = getCameraOffset();
        const screenX = (effect.x - offsetX) * tileSize;
        const screenY = (effect.y - offsetY) * tileSize;

        ctx.fillStyle = 'rgba(144, 238, 144, 0.5)'; // verde claro com transparência
        ctx.fillRect(screenX, screenY, tileSize, tileSize);
    });

    // Desenha o jogador
    const screenX = (player.x - offsetX) * tileSize;
    const screenY = (player.y - offsetY) * tileSize;

    // Renderiza inimigos visíveis
    enemies.forEach(enemy => {
        const { offsetX, offsetY } = getCameraOffset();
        const screenX = (enemy.x - offsetX) * tileSize;
        const screenY = (enemy.y - offsetY) * tileSize;

        if (
            enemy.x >= offsetX && enemy.x < offsetX + viewWidth &&
            enemy.y >= offsetY && enemy.y < offsetY + viewHeight
        ) {
            ctx.fillStyle = enemy.hit ? 'white' : enemy.color;
            ctx.fillRect(screenX, screenY, tileSize, tileSize);
        }
        updateBars();
        drawItems();
        drawInventory();

        ctx.fillText(`🌍 Fase: ${currentStage}`, 10, 130);
    });

    



    ctx.fillStyle = player.color;
    ctx.fillRect(screenX, screenY, tileSize, tileSize);
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText(`❤️ Vida: ${player.hp}`, 10, 25);

    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText(`🧠 XP: ${player.xp}/${player.xpToNextLevel}`, 10, 90);
    ctx.fillText(`⭐ Nível: ${player.level}`, 10, 110);
}

function movePlayer(dx, dy) {
    const newX = player.x + dx;
    const newY = player.y + dy;

    const isInsideMap = (
        newX >= 0 && newX < mapWidth &&
        newY >= 0 && newY < mapHeight
    );

    const isWalkable = map[newY][newX] === 0;

    const hasEnemy = enemies.some(enemy => enemy.x === newX && enemy.y === newY);

    const itemIndex = items.findIndex(item => item.x === newX && item.y === newY);
    if (itemIndex !== -1) {
        const item = items[itemIndex];
        if (item.type === 'hp' && player.hp < player.maxHp) {
            player.hp = Math.min(player.maxHp, player.hp + 2);
            console.log("🍎 Vida recuperada!");
        } else if (item.type === 'mp' && player.mp < player.maxMp) {
            player.mp = Math.min(player.maxMp, player.mp + 2);
            console.log("🔮 Mana recuperada!");
        }
        addToInventory(item.type);
        items.splice(itemIndex, 1);
    }


    if (isInsideMap && isWalkable && !hasEnemy) {
        player.x = newX;
        player.y = newY;
    }
}


function attackNearbyEnemies() {
    const directions = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 }
    ];

    directions.forEach(dir => {
        const targetX = player.x + dir.dx;
        const targetY = player.y + dir.dy;

        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            if (enemy.x === targetX && enemy.y === targetY) {
                enemy.hit = true; // ativa flash
                setTimeout(() => {
                    enemies.splice(i, 1); // remove inimigo após flash
                    player.xp += 5;
                    dropItem(enemy.x, enemy.y); // chance de drop
                    render();
                    if (enemies.length === 0) {
                        nextStage();
                    }
                }, 200); // tempo do flash
                break;
            }
        }
    });
    
    checkLevelUp();

    render();
}

function checkLevelUp() {
    while (player.xp >= player.xpToNextLevel) {
        player.xp -= player.xpToNextLevel;
        player.level += 1;
        player.maxHp += 1;
        player.maxMp += 1;
        player.hp = player.maxHp;
        player.mp = player.maxMp;
        player.xpToNextLevel = Math.floor(player.xpToNextLevel * 1.5);

        console.log(`🎉 Subiu para o nível ${player.level}!`);
    }
}

function drawInventory() {
  const slotSize = 32;
  const startX = canvas.width - (inventorySlots * slotSize) - 10;
  const startY = canvas.height - slotSize - 10;

  for (let i = 0; i < inventorySlots; i++) {
    const x = startX + i * slotSize;
    const y = startY;

    // Fundo do slot
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, slotSize, slotSize);

    // Item no slot
    const item = inventory[i];
    if (item) {
      ctx.fillStyle =
        item === 'potion' ? 'green' :
        item === 'weapon' ? 'orange' :
        item === 'shield' ? 'blue' : 'gray';

      ctx.beginPath();
      ctx.arc(x + slotSize / 2, y + slotSize / 2, slotSize / 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Borda
    ctx.strokeStyle = 'white';
    ctx.strokeRect(x, y, slotSize, slotSize);
  }

  ctx.fillStyle = 'white';
  ctx.font = '14px Arial';
  ctx.fillText("🎒 Inventário", startX, startY - 5);
}

function spawnEnemies() {
  for (let i = 0; i < numEnemies; i++) {
    let x, y;
    let tries = 0;
    const maxTries = 100;

    do {
      x = Math.floor(Math.random() * mapWidth);
      y = Math.floor(Math.random() * mapHeight);
      tries++;
    } while (
      map[y][x] !== 0 ||
      (x === player.x && y === player.y) ||
      enemies.some(e => e.x === x && e.y === y) ||
      tries > maxTries
    );

    if (tries <= maxTries) {
      const type = Math.random() < 0.5 ? 'goblin' : 'ghost';
      enemies.push(createEnemy(type, x, y));
    }
  }
}

function createEnemy(type, x, y) {
  switch (type) {
    case 'goblin':
      return {
        type: 'goblin',
        x, y,
        hp: 3,
        attack: 1,
        speed: 1,
        color: 'darkgreen',
        hit: false
      };
    case 'ghost':
      return {
        type: 'ghost',
        x, y,
        hp: 2,
        attack: 2,
        speed: 2,
        color: 'purple',
        hit: false,
        special: 'teleport'
      };
    default:
      return {
        type: 'basic',
        x, y,
        hp: 1,
        attack: 1,
        speed: 1,
        color: 'red',
        hit: false
      };
  }
}

function updateEnemies() {
    enemies.forEach(enemy => {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 6) {
            // Persegue o jogador
            const stepX = dx === 0 ? 0 : dx / Math.abs(dx);
            const stepY = dy === 0 ? 0 : dy / Math.abs(dy);

            tryMoveEnemy(enemy, stepX, stepY);
        } else {
            // Movimento aleatório
            const dirX = Math.floor(Math.random() * 3) - 1; // -1, 0 ou 1
            const dirY = Math.floor(Math.random() * 3) - 1;
            tryMoveEnemy(enemy, dirX, dirY);
        }
    });
}

function dropItem(x, y) {
  const chance = Math.random();
  if (chance < 0.4) { // 40% de chance de drop
    const types = ['potion', 'weapon', 'shield'];
    const type = types[Math.floor(Math.random() * types.length)];
    items.push({ x, y, type });
    console.log(`🎁 Inimigo dropou um ${type}!`);
  }
}


function tryMoveEnemy(enemy, dx, dy) {
    const newX = enemy.x + dx;
    const newY = enemy.y + dy;

    const occupied = enemies.some(e => e !== enemy && e.x === newX && e.y === newY);
    const blocked = (newX === player.x && newY === player.y);

    if (
        newX >= 0 && newX < mapWidth &&
        newY >= 0 && newY < mapHeight &&
        map[newY][newX] === 0 &&
        !occupied && !blocked
    ) {
        enemy.x = newX;
        enemy.y = newY;
    }
}

function addToInventory(itemType) {
  const emptyIndex = inventory.findIndex(slot => slot === null);
  if (emptyIndex !== -1) {
    inventory[emptyIndex] = itemType;
    console.log(`📦 Item coletado: ${itemType}`);
  } else {
    console.log("❌ Inventário cheio!");
  }
}


setInterval(() => {
    updateEnemies();
    checkEnemyCollision();
    render();
}, 500);

setInterval(() => {
    if (player.mp < player.maxMp) {
        player.mp += 1;
        render();
        console.log("🔋 Mana regenerada! Mana atual:", player.mp);
    }
}, 5000); // 5000 ms = 5 segundos




document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowUp': movePlayer(0, -1); break;
        case 'ArrowDown': movePlayer(0, 1); break;
        case 'ArrowLeft': movePlayer(-1, 0); break;
        case 'ArrowRight': movePlayer(1, 0); break;
        case ' ': attackNearbyEnemies(); break; // espaço
        case 'z': castMagic(); break; // z
    }

    render();
});

document.addEventListener('keydown', (e) => {
    
  if (e.key === 'h') {
     console.log("Usando poção de vida...");
    const potionIndex = inventory.findIndex(item => item === 'potion');
    if (potionIndex !== -1 && player.hp < player.maxHp) {
      inventory[potionIndex] = null;
      player.hp = Math.min(player.maxHp, player.hp + 3);
      console.log("💚 Poção usada! HP:", player.hp);
      render();
    }
  }
});


spawnEnemies();
render();
