class GameInstance {
    constructor(_id) {
        this.id = _id;
        this.players = [];
        this.diceSides = ['TICK', 'TACK', 'BOOM'];
        this.cards = ['ΒΙΟ', 'ΒΕ', 'ΡΑΣ', 'ΡΙ', 'ΓΡΑ', 'ΔΑ', 'ΚΟΙ', 'ΚΕ', 'ΝΤΕ', 'ΝΟ', 'ΤΡΟ', 'ΤΙ', 'ΣΤΑ', 'ΣΕ', 'ΛΟΣ', 'ΛΙ', 'ΒΟΣ'];
        this.currentSide = null;
        this.currentCard = null;
        this.isCardDrawn = false;
        this.isDiceRolled = false;
        this.roundStarted = false;
        this.gameEnded = false;
        this.cardsLeft = this.cards.length;
        this.playerWithBomb = null;
        this.getCurrentCard = () => this.currentCard;
        this.getCurrentSide = () => this.currentSide;
        this.getCardsLeft = () => this.cards.length;
        this.setCurrentCard = (card) => this.currentCard = card;
        this.setCurrentSide = (side) => this.currentSide = side;
        this.setCardsLeft = () => this.cardsLeft = this.cards.length;
    }
}

module.exports = GameInstance;