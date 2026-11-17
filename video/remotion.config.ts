import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// Pakai Chrome yang sudah terpasang supaya tidak mengunduh browser headless terpisah.
// Hapus baris ini bila Chrome ada di lokasi lain (atau pakai --browser-executable saat render).
Config.setBrowserExecutable("C:/Program Files/Google/Chrome/Application/chrome.exe");
// Laptop dengan RAM terbatas: render dua frame sekaligus saja.
Config.setConcurrency(2);
