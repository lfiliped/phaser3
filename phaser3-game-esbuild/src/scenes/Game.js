import Phaser from "phaser";
import constants from "../constants";
import CountdownController from "./CountdownController";

export default class Game extends Phaser.Scene {
    player;
    diamantes;
    enemies;
    platforms;
    cursors;
    rubisText;
    countdown;

    constructor() {
        super({ key: constants.scenes.game });
        this.rubis = 0; // Inicializa a contagem de rubis
        this.gameOver = false;
    }

    init(data) {
        this.rubis = 0;
        this.gameOver = false;
        this.gameStart = true;
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    preload() {}

    create() {
        this.add.image(400, 300, "landscape");
        this.createPlatform();
        this.createPlayer();
        this.createDiamante();
        this.createEnemies(); 
        this.createRubisText();
        this.createCountDown();

        this.collectSound = this.sound.add('collectSound');
        this.gameOverSound = this.sound.add('gameOverSound');
        this.jumpSound = this.sound.add('jumpSound');

        this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.diamantes, this.platforms);
        this.physics.add.collider(this.enemies, this.platforms); // Adicione a colisão com plataformas
        this.physics.add.collider(this.enemies, this.enemies); // Evita sobreposição dos inimigos
        this.physics.add.collider(this.player, this.enemies, this.handlePlayerEnemyCollide, null, this);

        this.physics.add.overlap(this.player, this.diamantes, this.collectDiamante, null, this);

        this.scene.launch(constants.scenes.ui);

        // Adicionar tecla ESC para pausar o jogo
        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.pause();
            this.scene.launch(constants.scenes.pauseMenu);
        });
    }

    createPlatform() {
        this.platforms = this.physics.add.staticGroup();
        this.platforms.create(500, 700, "ground").setScale(6).refreshBody();
        this.platforms.create(850, 540, "ground").setScale(0.7).refreshBody();
        this.platforms.create(90, 560, "ground").setScale(1.1).refreshBody();
        this.platforms.create(100, 300, "ground").setScale(0.6).refreshBody();
        this.platforms.create(600, 460, "ground").setScale(0.77).refreshBody();
        this.platforms.create(280, 400, "ground").setScale(1.2).refreshBody();
        this.platforms.create(400, 564, "ground").setScale(0.69).refreshBody();
        this.platforms.create(423, 230, "ground").setScale(0.9).refreshBody();
        this.platforms.create(823, 310, "ground").setScale(0.8).refreshBody();
        this.platforms.create(703, 170, "ground").setScale(1.25).refreshBody();
        this.platforms.create(203, 150, "ground").setScale(0.85 ).refreshBody();
    }

    createPlayer() {
        this.player = this.physics.add.sprite(400, 630, "dude");
        this.player.setBounce(0.2);
        this.player.setCollideWorldBounds(true);
    }

    createEnemies() {
        this.enemies = this.physics.add.group();
        this.createEnemy();
    }

    createEnemy() {
        let x = Phaser.Math.Between(0, 800);
        let y = Phaser.Math.Between(0, 300);
        const enemy = this.enemies.create(x, y, 'enemy'); // Spawna uma toupeira
        enemy.setBounce(0.2);
        enemy.setCollideWorldBounds(true);
        enemy.setVelocity(Phaser.Math.Between(-50, 50), 20); // Velocidade 
        enemy.allowGravity = true; // gravidade para as touperias
        enemy.anims.play('enemyTurn', true);

        // Movimento aleatório inicial
        enemy.direction = Phaser.Math.Between(0, 1) ? 'left' : 'right';
        enemy.setVelocityX(enemy.direction === 'left' ? -50 : 50);
    }

    createDiamante() {
        this.diamantes = this.physics.add.group({
            key: "diamante",
            repeat: 11,
        });

        this.diamantes.children.iterate((child) => {
            let x, y;
            do {
                x = Phaser.Math.Between(50, 750);
                y = Phaser.Math.Between(50, 550);
            } while (this.checkOverlapWithPlatforms(x, y));
            child.setPosition(x, y);
            child.setBounceY(0);
            child.setCollideWorldBounds(true);
            child.body.allowGravity = false;
            child.anims.play('rotate'); // Adiciona a animação de rotação
        });
    }

    createRubisText() {
        this.rubisText = this.add.text(16, 16, "Rubis: 0", {
            fontFamily: '"PressStart2P"', // Define a fonte personalizada
            fontSize: "20px", // Ajuste o tamanho da fonte conforme necessário
            fill: "#ffffff",
        });
    }

    createCountDown() {
        const { width } = this.scale;
        const timerLabel = this.add
            .text(width * 0.5, 50, "15", {
                fontFamily: '"PressStart2P"', // Define a fonte personalizada
                fontSize: "20px", // Ajuste o tamanho da fonte conforme necessário
                fill: "#ffffff",
            })
            .setOrigin(0.5);
        this.countdown = new CountdownController(this, timerLabel);
        this.countdown.start(this.handleCountdownFinished.bind(this), 15000); // 15 segundos
    }

    handleCountdownFinished() {
        this.physics.pause();
        this.displayGameOverText("Time up!");
        this.gameOverSound.play(); // Toca o som de game-over
        this.scene.start(constants.scenes.gameOver);
    }

    update() {
        if (this.gameOver) {
            return;
        }

        this.updatePlayerPosition();
        this.countdown.update();

        // Atualizar a posição dos inimigos
        this.enemies.children.iterate((enemy) => {
            // Evitar obstáculos e plataformas
            const direction = this.player.x < enemy.x ? -1 : 1;
            const nextX = enemy.x + direction * enemy.body.width;
            const isPlatformAhead = this.platforms.children.entries.some(platform => {
                return nextX > platform.x - platform.displayWidth / 2 &&
                       nextX < platform.x + platform.displayWidth / 2 &&
                       enemy.y + enemy.body.height / 2 < platform.y;
            });

            // Se houver uma plataforma à frente e o inimigo estiver no chão, pule
            if (isPlatformAhead && enemy.body.touching.down) {
                enemy.setVelocityY(-330);
            } else {
                enemy.setVelocityX(direction * 50);
                enemy.direction = direction === -1 ? 'left' : 'right';
            }

            if (enemy.body.velocity.x > 0) {
                enemy.anims.play('enemyRight', true);
            } else if (enemy.body.velocity.x < 0) {
                enemy.anims.play('enemyLeft', true);
            } else {
                enemy.anims.play('enemyTurn', true);
            }
        });
    }

    updatePlayerPosition() {
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-160);
            this.player.anims.play("left", true);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(160);
            this.player.anims.play("right", true);
        } else {
            this.player.setVelocityX(0);
            this.player.anims.play("turn");
        }
        if (this.cursors.up.isDown && this.player.body.touching.down) {
            this.player.setVelocityY(-330);
            this.jumpSound.play();
        }
    }

    collectDiamante(player, diamante) {
        diamante.disableBody(true, true);
        this.collectSound.play();
        this.updateRubis();
        this.countdown.start(this.handleCountdownFinished.bind(this), 15000); // Reinicia para 15 segundos
        if (this.diamantes.countActive(true) === 0) {
            this.createNewBatchOfDiamantes(player);
        }
    }

    updateRubis() {
        this.rubis += 1;
        this.rubisText.setText("Rubis: " + this.rubis);
    }

    createNewBatchOfDiamantes(player) {
        this.diamantes.clear(true, true);

        this.diamantes = this.physics.add.group({
            key: "diamante",
            repeat: 11,
        });

        this.diamantes.children.iterate((child) => {
            let x, y;
            do {
                x = Phaser.Math.Between(50, 750);
                y = Phaser.Math.Between(50, 550);
            } while (this.checkOverlapWithPlatforms(x, y));
            child.setPosition(x, y);
            child.setBounceY(0);
            child.setCollideWorldBounds(true);
            child.body.allowGravity = false;
            child.anims.play('rotate'); // Adiciona a animação de rotação
        });

        this.physics.add.collider(this.diamantes, this.platforms);
        this.physics.add.overlap(this.player, this.diamantes, this.collectDiamante, null, this);

        // Cria um novo inimigo sem remover os existentes
        this.createEnemy();
    }

    checkOverlapWithPlatforms(x, y) {
        let overlap = false;
        this.platforms.getChildren().forEach(platform => {
            if (x > platform.x - platform.displayWidth / 2 &&
                x < platform.x + platform.displayWidth / 2 &&
                y > platform.y - platform.displayHeight / 2 &&
                y < platform.y + platform.displayHeight / 2) {
                overlap = true;
            }
        });
        return overlap;
    }

    handlePlayerEnemyCollide(player, enemy) {
        this.physics.pause();
        player.setTint(0xff0000);
        player.anims.play("turn");
        this.gameOverSound.play();
        this.gameOver = true;
        this.scene.start(constants.scenes.gameOver);
    }

    displayGameOverText(message = "Game Over!") {
        const { width, height } = this.scale;
        this.add
            .text(width * 0.5, height * 0.5, message, {
                fontFamily: '"PressStart2P"', // Define a fonte personalizada
                fontSize: "48px",
                fill: "#ff0000",
            })
            .setOrigin(0.5);
    }
}
