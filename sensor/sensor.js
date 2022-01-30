const TARGET_PORT = 55443;

const getRandomInt = (max) => {
    return Math.floor(Math.random() * max);
}

const main = () => {
    setInterval(function(){ console.log(getRandomInt(35)) },1000)
}


main();