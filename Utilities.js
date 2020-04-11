

module.exports = {
    getCards: () => {
        return ['ΒΙΟ', 'ΒΕ', 'ΡΑΣ', 'ΡΙ', 'ΓΡΑ', 'ΔΑ', 'ΚΟΙ', 'ΚΕ', 'ΝΤΕ', 'ΝΟ', 'ΤΡΟ', 'ΤΙ', 'ΣΤΑ', 'ΣΕ', 'ΛΟΣ', 'ΛΙ', 'ΒΟΣ'];
    },

    getRandomItemFromArray: (array, remove = false) => {
        const idx = Math.floor(Math.random() * array.length);
        const item = array[idx];
        if (remove) {
            array.splice(idx, 1);
        }
        return item;
    },

    getRandomSecs: () => {
        return Math.floor(Math.random() * (40 - 10) + 10);
    }
}