import "./style.css";

import Phaser from "phaser";

type Fruit = {
  name: string;
  radius: number;
};

type Theme = "ville" | "port";

interface Themeconfig {
  background: string;
  suffix: string;
  btnRetry: string
}

const THEME_DATA: Record<Theme, Themeconfig> = {
  ville: {background: "background_ville.png",suffix:'', btnRetry: "rebatir_ville.png"},
  port: {background: "background_port.png",suffix:'b', btnRetry: "rebatir_port.png"}
};

const fruits: Fruit[] = [
  { name: "fruit1", radius: 30 },
  { name: "fruit2", radius: 35 },
  { name: "fruit3", radius: 40 },
  { name: "fruit4", radius: 50 },
  { name: "fruit5", radius: 65 },
  { name: "fruit6", radius: 70 },
  { name: "fruit7", radius: 80 },
  { name: "fruit8", radius: 90 },
];

const PLAY_WIDTH = 550;
const PANEL_WIDTH = 400;
const TOTAL_WIDTH = PLAY_WIDTH + PANEL_WIDTH;
const GAME_HEIGHT = 1000;
const WALL_MARGIN = 65;

class Main extends Phaser.Scene {
  constructor() {
    super("Main");
  }

  score = 0;
  dropper!: Phaser.GameObjects.Image;
  group!: Phaser.GameObjects.Group;
  ceiling!: MatterJS.BodyType;
  lineVisible!: Phaser.GameObjects.Rectangle;
  gameOver = false;
  scoreText!: Phaser.GameObjects.Text;
  loseText!: Phaser.GameObjects.Text;
  unlockedBonuses = new Set<number>();
  scoreMultiplier = 1;
  canChooseNextFruit = false;
  nextFruitChoice: Fruit = fruits[0];
  bonusMessage!: Phaser.GameObjects.Text;
  nextFruit: Fruit = fruits[0];
  nextFruitImage!: Phaser.GameObjects.Image;
  bonusTierTexts: Phaser.GameObjects.Text[] = [];
  currentTheme: Theme = "ville";

  init(data: {theme: Theme}){
    this.currentTheme = data.theme || "ville";
  }

  getRandomDropFruit() {
    return fruits[Math.floor(Math.random() * 3)];
  }

  showBonusMessage(message: string) {
    this.bonusMessage.setText(message);
    this.tweens.killTweensOf(this.bonusMessage);
    this.tweens.add({
      targets: this.bonusMessage,
      alpha: { from: 0, to: 1 },
      y: { from: 245, to: 215 },
      duration: 180,
      yoyo: true,
      hold: 900,
    });
  }

  applyScoreBonuses(previousScore: number) {
    if (previousScore < 250 && this.score >= 250 && !this.unlockedBonuses.has(250)) {
      this.unlockedBonuses.add(250);
      this.scoreMultiplier = 1.5;
      this.showBonusMessage("Bonus 250: score x1.5");
      this.updateBonusTiers();
    }
    if (previousScore < 500 && this.score >= 500 && !this.unlockedBonuses.has(500)) {
      this.unlockedBonuses.add(500);
      this.scoreMultiplier = 2;
      this.showBonusMessage("Bonus 500: score x2");
      this.updateBonusTiers();
    }
    if (previousScore < 1000 && this.score >= 1000 && !this.unlockedBonuses.has(1000)) {
      this.unlockedBonuses.add(1000);
      this.scoreMultiplier = 3;
      this.showBonusMessage("Bonus 1000: score x3 !");
      this.updateBonusTiers();
    }
  }

  preload() {
    const config = THEME_DATA[this.currentTheme];

    this.textures.remove("theme_bg");
    for (const fruit of fruits) {
      this.textures.remove(fruit.name);
    }

    this.load.image("theme_bg", config.background);
    this.load.image("cadre_jeu", "fondnoir.avif");
    this.load.image("btn_retry",config.btnRetry)
    this.load.audio("pop_sound", "pop.mp3");
    this.load.audio("bg_music", "ambient.mp3");

    //inutile pour le moment, à voir après mdr
    // for (let i = 0; i <= 9; i++) {
    //   this.load.image(`${i}`, `${i}.png`);
    // }

    for (const fruit of fruits) {
      const assetName = `${fruit.name}${config.suffix}`;
      this.load.image(fruit.name, `${assetName}.png`);
    }
  }

  drawScore() {
    this.scoreText.setText(this.score.toString());
  }

  updateBonusTiers() {
    const tiers = [
      { threshold: 250, line1: "250 pts", line2: "Score x1.5" },
      { threshold: 500, line1: "500 pts", line2: "Score x2" },
      { threshold: 1000, line1: "1000 pts", line2: "Score x3" },
    ];

    tiers.forEach((tier, i) => {
      const unlocked = this.unlockedBonuses.has(tier.threshold);
      this.bonusTierTexts[i].setStyle({
        fontFamily: "Pirata One",
        fontSize: "26px",
        color: unlocked ? "#ffe6a1" : "#555577",
        stroke: "#000000",
        strokeThickness: unlocked ? 5 : 3,
        align: "center",
        lineSpacing: 6,
      });
      this.bonusTierTexts[i].setText(
        (unlocked ? "✔  " : "🔒  ") + tier.line1 + "\n" + tier.line2
      );
    });
  }

  updateNextFruitPanel(fruit: Fruit) {
    this.nextFruit = fruit;
    const size = Math.min(fruit.radius * 2, 140);
    this.nextFruitImage
      .setTexture(fruit.name)
      .setDisplaySize(size, size);
  }

  updateDropper(fruit: Fruit) {
    this.nextFruitChoice = fruit;
    this.dropper
      .setTexture(fruit.name)
      .setName(fruit.name)
      .setDisplaySize(fruit.radius * 2, fruit.radius * 2)
      .setY(fruit.radius + 205);
    this.setDropperX(this.input.activePointer.x);

    this.group.getChildren().forEach((gameObject) => {
      if (gameObject instanceof Phaser.GameObjects.Image) {
        gameObject.postFX.clear();
        if (gameObject.name === fruit.name) {
          gameObject.postFX.addShine();
        }
      }
    });
  }

  setDropperX(x: number) {
    const p = WALL_MARGIN;
    const r = this.dropper.displayWidth / 2;
    if (x < r + p) {
      x = r + p;
    } else if (x > PLAY_WIDTH - r - p) {
      x = PLAY_WIDTH - r - p;
    }
    this.dropper.setX(x);
  }

  addFruit(x: number, y: number, fruit: Fruit) {
    const newFruit = this.matter.add
      .image(x, y, fruit.name)
      .setName(fruit.name)
      .setDisplaySize(fruit.radius * 2, fruit.radius * 2)
      .setCircle(fruit.radius)
      .setFriction(0.005)
      .setBounce(0.2)
      .setDepth(-1)

    this.time.delayedCall(1000, () => {
      if (newFruit.active) {
        newFruit.setOnCollideWith(this.ceiling, ()=>{
          if (!this.gameOver) {
            this.events.emit("ceilinghit");
          }
        });
      }
    });

    return newFruit;
  }

  create() {
    this.unlockedBonuses.clear();
    this.scoreMultiplier = 1;
    this.canChooseNextFruit = false;
    this.nextFruitChoice = fruits[0];
    this.bonusTierTexts = [];

    const config = THEME_DATA[this.currentTheme];
    document.body.style.backgroundImage = `url('${config.background}')`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundAttachment = "fixed";
    document.body.style.backgroundColor = "#000000";

    if (!this.sound.get("bg_music")){
      const music = this.sound.add("bg_music", {
        volume: 0.3,
        loop: true
      });
      music.play();
    } else if (!this.sound.get("bg_music").isPlaying) {
      this.sound.get("bg_music").play()
    }

    this.add
      .nineslice(0, 0, "cadre_jeu")
      .setOrigin(0)
      .setDisplaySize(TOTAL_WIDTH , GAME_HEIGHT)
      .setPipeline("Light2D")
      .setDepth(-2);

    this.matter.world.setBounds(
      WALL_MARGIN,
      0,
      PLAY_WIDTH - WALL_MARGIN * 2,
      GAME_HEIGHT - 1
    );
    this.group = this.add.group();

    const light = this.lights
      .addLight(this.input.activePointer.x, this.input.activePointer.y, 1000, 0x99ffff, 0.75)
      .setScrollFactor(0);
    this.lights.enable().setAmbientColor(0xdddddd);

    const emitter = this.add.particles(0, 0, fruits[0].name, {
      lifespan: 1000,
      speed: { min: 200, max: 350 },
      scale: { start: 0.1, end: 0 },
      rotate: { start: 0, end: 360 },
      alpha: { start: 1, end: 0 },
      gravityY: 200,
      emitting: false,
    });

    this.scoreText = this.add.text(PLAY_WIDTH / 2, 140, "0", {
      fontFamily: "Pirata One",
      fontSize: "80px",
      color: "#ffe6a1",
      stroke: "#000000",
      strokeThickness: 7,
    }).setOrigin(0.5, 0.5).setDepth(2);

    this.bonusMessage = this.add
      .text(PLAY_WIDTH / 2, 215, "", {
        fontFamily: "Pirata One",
        fontSize: "38px",
        color: "#ffe6a1",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(3);

    const panelX = PLAY_WIDTH;
    const panelCenterX = panelX + PANEL_WIDTH / 2;

    const separator = this.add
      .rectangle(panelX, 0, 2, GAME_HEIGHT, 0xccccff)
      .setOrigin(0, 0)
      .setAlpha(0.22)
      .setDepth(1);
    separator.postFX.addGlow();

    this.add.text(panelCenterX, 180, "— NEXT —", {
      fontFamily: "Pirata One",
      fontSize: "46px",
      color: "#ccccff",
      stroke: "#000000",
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(2);

    const nextBox = this.add
      .rectangle(panelCenterX, 340, 200, 200, 0x0a0a1a, 0.75)
      .setStrokeStyle(2, 0x9999cc, 0.7)
      .setDepth(2);
    nextBox.postFX.addGlow(0x9999cc, 0.4);

    this.nextFruitImage = this.add
      .image(panelCenterX, 340, fruits[0].name)
      .setDisplaySize(120, 120)
      .setDepth(3);
    this.nextFruitImage.postFX.addGlow(0x99ddff, 0.6);

    this.add
      .rectangle(panelCenterX, 470, PANEL_WIDTH - 40, 2, 0xccccff)
      .setAlpha(0.18)
      .setDepth(2);

    this.add.text(panelCenterX, 505, "-- BONUS --", {
      fontFamily: "Pirata One",
      fontSize: "42px",
      color: "#ccccff",
      stroke: "#000000",
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(2);

    const tierStartY = 615;
    const tierSpacing = 130;
    const tierLabels = [
      { line1: "250 pts", line2: "Score x1.5" },
      { line1: "500 pts", line2: "Score x2" },
      { line1: "1000 pts", line2: "Score x3" },
    ];

    tierLabels.forEach((data, i) => {
      const cardY = tierStartY + i * tierSpacing;

      this.add
        .rectangle(panelCenterX, cardY, PANEL_WIDTH - 50, 110, 0x0d0d22, 0.8)
        .setStrokeStyle(1.5, 0x444466, 0.6)
        .setDepth(2);

      const t = this.add.text(
        panelCenterX,
        cardY,
        "🔒  " + data.line1 + "\n" + data.line2,
        {
          fontFamily: "Pirata One",
          fontSize: "26px",
          color: "#555577",
          stroke: "#000000",
          strokeThickness: 3,
          align: "center",
          lineSpacing: 6,
        }
      ).setOrigin(0.5).setDepth(3);

      this.bonusTierTexts.push(t);
    });

    this.updateBonusTiers();

    this.input.keyboard?.on("keydown-G", () => {
      console.log("Game Over forcé pour la démo");
      this.events.emit("ceilinghit");
    });

    const button = this.add
      .image(PLAY_WIDTH / 2, GAME_HEIGHT / 2, "btn_retry")
      .setScale(1.5)
      .setInteractive({ useHandCursor: true })
      .setVisible(false)
      .setDepth(10);

    button.postFX.addGlow(0x000000, 0.75);
    button.on("pointerover", () => {
      this.tweens.add({ targets: button, scale: 1.7, ease: "Linear", duration: 100 });
    });
    button.on("pointerout", () => {
      this.tweens.add({ targets: button, scale: 1.5, ease: "Linear", duration: 100 });
    });
    button.on("pointerup", () => {
      this.score = 0;
      this.gameOver = false;
      this.scene.restart({theme: this.currentTheme});
    });

    this.dropper = this.add.image(this.input.activePointer.x, 0, fruits[0].name);
    const glow = this.dropper.postFX.addGlow(0x99ddff);
    this.tweens.addCounter({
      yoyo: true,
      repeat: -1,
      from: 1,
      to: 3,
      duration: 1000,
      onUpdate: function (tween) {
        glow.outerStrength = tween.getValue();
      },
    });

    const firstFruit = this.getRandomDropFruit();
    const firstNext = this.getRandomDropFruit();
    this.updateDropper(firstFruit);
    this.updateNextFruitPanel(firstNext);

    this.lineVisible = this.add.rectangle(
      PLAY_WIDTH / 2,
      200,
      PLAY_WIDTH - WALL_MARGIN * 2,
      4,
      0xff0000
    );
    this.lineVisible.setDepth(1);
    this.lineVisible.setAlpha(0.8);
    this.lineVisible.postFX.addGlow(0xff0000, 2);

    this.ceiling = this.matter.add.rectangle(
      PLAY_WIDTH / 2, 
      100,
      PLAY_WIDTH, 
      200, 
      { isStatic: true, isSensor: true }
    )

    const line = this.add
      .rectangle(WALL_MARGIN + 2, 200, PLAY_WIDTH - WALL_MARGIN * 2 - 4, 2, 0xccccff)
      .setOrigin(0)
      .setAlpha(0.1)
      .setDepth(-2);
    line.postFX.addShine();
    line.postFX.addGlow();

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      this.setDropperX(pointer.x);
      light.setPosition(pointer.x, pointer.y);
    });

    this.input.on("pointerup", () => {
      if (!this.dropper.visible || this.gameOver) return;

      this.dropper.setVisible(false);
      this.time.delayedCall(500, () => this.dropper.setVisible(!this.gameOver));

      const currentFruit = fruits.find((f) => f.name === this.dropper.name)!;
      const gameObject = this.addFruit(this.dropper.x, this.dropper.y, currentFruit);
      this.group.add(gameObject);

      const upcoming = this.nextFruit;
      this.updateDropper(upcoming);

      const newNext = this.canChooseNextFruit
        ? this.nextFruitChoice
        : this.getRandomDropFruit();
      this.updateNextFruitPanel(newNext);
    });

    this.matter.world.on(
      "collisionstart",
      (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => {
        for (const pair of event.pairs) {
          if (pair.bodyA.gameObject?.name === pair.bodyB.gameObject?.name) {
            this.sound.play("pop_sound", {volume: 0.5});

            const fruitIndex = fruits.findIndex(
              (fruit) => fruit.name === pair.bodyA.gameObject?.name
            );
            if (fruitIndex === -1) continue;

            const previousScore = this.score;
            this.score += (fruitIndex + 1) * 2 * this.scoreMultiplier;
            this.applyScoreBonuses(previousScore);
            this.drawScore();

            pair.bodyA.gameObject.destroy();
            pair.bodyB.gameObject.destroy();

            emitter.setTexture(fruits[fruitIndex].name);
            emitter.emitParticleAt(pair.bodyB.position.x, pair.bodyB.position.y, 10);

            const newFruit = fruits[fruitIndex + 1];
            if (!newFruit) continue;

            const gameObject = this.addFruit(pair.bodyB.position.x, pair.bodyB.position.y, newFruit);
            this.group.add(gameObject);
            return;
          }
        }
      }
    );

    this.loseText = this.add.text(PLAY_WIDTH / 2, GAME_HEIGHT / 2 - 150, "PERDU !", {
      fontFamily: "Pirata One",
      fontSize: "120px",
      color: "#ff0000",
      stroke: "#000000",
      strokeThickness: 10,
    }).setOrigin(0.5).setDepth(11).setVisible(false);

// Un petit effet de "battement" pour le rendre plus dynamique
    this.tweens.add({
        targets: this.loseText,
        scale: 1.1,
        duration: 500,
        yoyo: true,
        repeat: -1
    });
    
    this.events.on("ceilinghit", () => {
      this.gameOver = true;
      button.setVisible(true);
      this.loseText.setVisible(true)
      this.dropper.setVisible(false);
    });
  }
}

class Menu extends Phaser.Scene {
  constructor() {
    super("Menu");
  }

  preload() {
    this.load.image("btn_ville", "btn_ville.png");
    this.load.image("btn_port", "btn_port.png");
    this.load.image("cadre_jeu", "fondnoir.avif");
  }

  create() {    
    this.add.text(TOTAL_WIDTH / 2, 200, "Choisissez votre thème", {
      fontFamily: "Pirata One", fontSize: "60px", color: "#ffe6a1",
      stroke: "#000000", strokeThickness: 8
    }).setOrigin(0.5);

    const btnVille = this.add.image(TOTAL_WIDTH / 2, 450, "btn_ville")
      .setInteractive({ useHandCursor: true })
      .setScale(1.5)
      .on("pointerup", () => this.scene.start("Main", { theme: "ville" }));

    const btnPort = this.add.image(TOTAL_WIDTH / 2, 700, "btn_port")
      .setInteractive({ useHandCursor: true })
      .setScale(1.5)
      .on("pointerup", () => this.scene.start("Main", { theme: "port" }));

    [btnVille, btnPort].forEach(btn => {
      btn.on('pointerover', ()  => {
        btn.setTint(0xeeeeee);
        this.tweens.add({targets: btn, scale: 1.7, duration: 100});
      }); 
      btn.on('pointerout', () => {
        btn.clearTint();
        this.tweens.add({targets: btn, scale: 1.5, duration: 100});
      });
    });
  }
}

new Phaser.Game({
  scene: [Menu, Main],
  width: TOTAL_WIDTH,
  height: GAME_HEIGHT,
  scale: {
    mode: Phaser.Scale.ScaleModes.FIT,
  },
  autoCenter: Phaser.Scale.Center.CENTER_HORIZONTALLY,
  transparent: true,
  physics: {
    default: "matter",
    matter: {
      debug: false,
    },
  },
});