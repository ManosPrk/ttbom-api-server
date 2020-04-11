class GameInstance {
    constructor(_id, _player) {
        this.id = _id;
        this.players = [_player];
        this.diceSides = ['TICK', 'TACK', 'BOOM'];
        this.cards = ['ΒΙΟ', 'ΒΕ', 'ΡΑΣ', 'ΡΙ', 'ΓΡΑ', 'ΔΑ', 'ΚΟΙ', 'ΚΕ', 'ΝΤΕ', 'ΝΟ', 'ΤΡΟ', 'ΤΙ', 'ΣΤΑ', 'ΣΕ', 'ΛΟΣ', 'ΛΙ', 'ΒΟΣ'];
        this.currentCard = null;
        this.playerWithBomb = _player;
    }
}

module.exports = GameInstance;