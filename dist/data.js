"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getData = void 0;
const puppeteer = __importStar(require("puppeteer"));
function getData() {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer.launch({ headless: false });
        const page = yield browser.newPage();
        yield page.goto('https://mangakakalot.com');
        const links = yield page.evaluate(() => {
            const fiches = document.querySelectorAll(".itemupdate");
            const array = [];
            for (let i = 0; i < fiches.length; i++) {
                array.push(fiches[i].querySelector("a").href);
            }
            return array;
        });
        let h1s = [];
        const MAX_PAGE_TO_LOAD = 5;
        for (let i = 0; i < links.length; i += MAX_PAGE_TO_LOAD) {
            let linksChunk = links.slice(i, i + MAX_PAGE_TO_LOAD);
            const promises = linksChunk.map((link) => __awaiter(this, void 0, void 0, function* () {
                const newPage = yield browser.newPage();
                yield newPage.goto(link, { timeout: 60000 });
                // @ts-ignore
                const h1 = yield newPage.evaluate(() => {
                    // @ts-ignore
                    return document.querySelector("h1").textContent;
                });
                yield newPage.close();
                return h1;
            }));
            h1s = h1s.concat(yield Promise.all(promises));
        }
        h1s.forEach((h1) => {
            console.log(h1);
        });
        yield browser.close();
    });
}
exports.getData = getData;
