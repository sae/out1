/**
 * based on am2320-dht firmware (mjs+dht)
 * */
load('api_config.js');
load('api_gpio.js');
load('api_mqtt.js');
load('api_net.js');
load('api_sys.js');
load('api_timer.js');
load('api_dht.js');
load('api_rpc.js');

let led = 2;//Cfg.get('pins.led');

let getInfo = function() {
  return JSON.stringify({
    total_ram: Sys.total_ram(),
    free_ram: Sys.free_ram()
  });
};

GPIO.set_mode(led, GPIO.MODE_OUTPUT);
let mydht = DHT.create(12, DHT.DHT22);
let tmp=0;
let hum=0;

Timer.set(3000 /* 1 sec */, true /* repeat */, function() {
  GPIO.write(led,1);
  tmp=mydht.getTemp();
  hum=mydht.getHumidity();
  //if (isNaN(tmp) || isNaN(hum)) GPIO.write(led,0);
}, null);

RPC.addHandler('t', function(args) {
    return Math.round(tmp);
});

RPC.addHandler('h', function(args) {
    return Math.round(hum);
});

/**
 * Motion detector block
 * */
let mov_pin = 14; //movement sensor pin
let led_tape=5; //light control pin
let mvm=0; //movement detected
let led_tape_disabled=0; //disable led if light sensor ON
let led_mode=0; //<0 0 >0 for OFF/by sensor/ON

GPIO.set_mode(mov_pin, GPIO.MODE_INPUT);
GPIO.set_pull(mov_pin, GPIO.PULL_NONE); //no pull down in esp8266
GPIO.set_mode(led_tape, GPIO.MODE_OUTPUT);
GPIO.write(led_tape,0);
//by timer, not by interrupt, so we can make some time-based handling: delay or slow dimming if use pwm
Timer.set(500 , true , function() {
  mvm=GPIO.read(mov_pin);
  if (led_mode!==0) return;
  if(mvm===1 && led_tape_disabled===0) {  
    GPIO.write(led_tape,1);
  } else {
    GPIO.write(led_tape,0);
  }
}, null);

RPC.addHandler('mvm', function(args) {
    return mvm;
});

RPC.addHandler('led', function(args) {
    if (typeof(args) === 'object' && typeof(args.mode) === 'number') {
      led_mode=args.mode;
      if (led_mode>0) GPIO.write(led_tape,1);
      if (led_mode<0) GPIO.write(led_tape,0);
    }
    return led_mode;
});

/**
 * Light sensor block
 * */
let light_pin=16; //light sensor digital pin
GPIO.set_mode(light_pin, GPIO.MODE_INPUT);
GPIO.set_pull(light_pin, GPIO.PULL_UP); //no pull down in esp8266

let light=0;//0 - darkness, 1 - daylight

Timer.set(2000 , true , function() {
  if (GPIO.read(light_pin)!==0) {
    light=0;
    led_tape_disabled=0; //control led tape here
  } else {
    light=1;
    led_tape_disabled=1; //control led tape here
  }
}, null);

//interrupt doesnt work for me here :-\
/*
GPIO.set_int_handler(light_pin, GPIO.INT_EDGE_ANY, function(x) {
  if (GPIO.read(light_pin)!==0) {
    GPIO.write(led,1);
    light=0;
  } else {
    GPIO.write(led,0);
    light=1;
  }
}, null);
GPIO.enable_int(light_pin);
*/

RPC.addHandler('light', function(args) {
    return light;
});
 
 