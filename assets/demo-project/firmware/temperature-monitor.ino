// Forge Demo Project — Temperature Monitor v1
// Reads an LM35 analog temperature sensor and displays
// the result on a 16x2 I²C LCD.
//
// Circuit:
//   LM35  VCC → Arduino 5V
//         OUT → Arduino A0
//         GND → Arduino GND
//   LCD   SDA → Arduino A4
//         SCL → Arduino A5
//   R1,R2     → 10kΩ pull-ups on SDA / SCL to 5V
//   R3        → 220Ω on LCD backlight anode
//   C1        → 100nF between LM35 VCC and GND

#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#define LM35_PIN A0
#define LCD_ADDR 0x27
#define LCD_COLS 16
#define LCD_ROWS 2

LiquidCrystal_I2C lcd(LCD_ADDR, LCD_COLS, LCD_ROWS);

void setup() {
  Serial.begin(9600);
  Serial.println("Forge Demo — Temperature Monitor v1");

  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Temp Monitor");
  lcd.setCursor(0, 1);
  lcd.print("Initializing...");
  delay(500);
}

void loop() {
  int raw = analogRead(LM35_PIN);
  float voltage = raw * (5.0 / 1023.0);
  float tempC = voltage * 100.0;
  float tempF = tempC * 9.0 / 5.0 + 32.0;

  Serial.print("Temperature: ");
  Serial.print(tempC, 1);
  Serial.print(" C / ");
  Serial.print(tempF, 1);
  Serial.println(" F");

  lcd.setCursor(0, 0);
  lcd.print("Temp: ");
  lcd.print(tempC, 1);
  lcd.print(" C");

  lcd.setCursor(0, 1);
  lcd.print("      ");
  lcd.print(tempF, 1);
  lcd.print(" F");

  delay(1000);
}
