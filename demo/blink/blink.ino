// Forge Demo Project — Blink LED
// A simple Arduino sketch that blinks the built-in LED.
// This project demonstrates the full Forge workflow:
//   1. Circuit → schematic with an Arduino Uno + LED + resistor
//   2. PCB → single-layer board layout
//   3. CAD → enclosure model
//   4. Code → this sketch
//   5. BOM → bill of materials
//   6. Export → Gerber + SVG
//   7. Compile & Upload → flash to board

const int LED_PIN = 13;  // Built-in LED on most Arduino boards

void setup() {
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(9600);
  Serial.println("Forge Demo — Blink LED");
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  Serial.println("LED ON");
  delay(1000);

  digitalWrite(LED_PIN, LOW);
  Serial.println("LED OFF");
  delay(1000);
}
