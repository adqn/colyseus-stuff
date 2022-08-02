import React, { useEffect } from "react";
import * as Colyseus from "colyseus.js";
import { Schema } from "@colyseus/schema";
import styled from "styled-components";
import "../styles/playableArea.css";

interface Player extends Schema {
  x: number;
  y: number;
  score: number;
}

interface Item extends Schema {
  x: number;
  y: number;
}

interface Object {
  top: number;
  left: number;
  height: number;
  width: number;
}

export const StateHandlerRoom = () => {
  const client = new Colyseus.Client("ws://localhost:2567");

  let room: Colyseus.Room;

  type Players = { [index: string]: any };
  type Items = { [index: string]: any };

  useEffect(() => {
    client.joinOrCreate("state_handler").then((room_instance) => {
      room = room_instance;
      if (room) {
        console.log("Connected to room: ", room);
      }

      const players: Players = {};
      const items: Items = {};
      const distLines: any = {};
      const colors = ["red", "green", "yellow", "blue", "cyan", "magenta"];

      // add items
      room.state.items.onAdd = function (item: Item, itemId: string) {
        const dom = document.createElement("div");
        console.log(itemId);
        dom.className = "item";
        dom.style.left = item.x + "px";
        dom.style.top = item.y + "px";

        items[itemId] = dom;
        document.getElementById("screen")?.appendChild(dom);

        const distLine = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "line"
        );
        distLine.setAttribute("stroke", "lightgreen");
        distLine.setAttribute("stroke-width", "2");
        distLine.setAttribute("fill-opacity", ".2");
        distLine.setAttribute("x1", "0");
        distLine.setAttribute("y1", "0");
        distLine.setAttribute("x2", "0");
        distLine.setAttribute("y2", "0");

        document.getElementById("overlay")?.appendChild(distLine);
        distLines[itemId] = distLine;
      };

      // listen to patches coming from the server
      room.state.players.onAdd = function (player: Player, sessionId: string) {
        let dom = document.createElement("div");
        dom.className = "player";
        dom.style.left = player.x + "px";
        dom.style.top = player.y + "px";
        dom.style.background =
          colors[Math.floor(Math.random() * colors.length)];
        dom.innerText = "Player " + sessionId;

        player.onChange = function (changes) {
          dom.style.left = player.x + "px";
          dom.style.top = player.y + "px";
        };

        players[sessionId] = dom;
        document.getElementById("screen")?.appendChild(dom);
      };

      room.state.players.onRemove = function (
        player: Player,
        sessionId: string
      ) {
        document.body.removeChild(players[sessionId]);
        delete players[sessionId];
      };

      room.onMessage("hello", (message) => {
        console.log(message);
      });

      drawCenterLines(players, items, distLines);

      window.addEventListener("keydown", function (e) {
        if (e.which === 38) {
          up();
        } else if (e.which === 39) {
          right();
        } else if (e.which === 40) {
          down();
        } else if (e.which === 37) {
          left();
        }

        drawCenterLines(players, items, distLines);

        Object.keys(players).forEach((player) => {
          if (Object.keys(items).length > 0) {
            Object.keys(items).forEach((item) => {
              // const playerPos = {
              //   top: parseInt(players[player].style.top),
              //   left: parseInt(players[player].style.left),
              //   height: parseInt(players[player].offsetHeight),
              //   width: parseInt(players[player].offsetWidth),
              // };
              // const objPos = {
              //   top: parseInt(items[item].style.top),
              //   left: parseInt(items[item].style.left),
              //   height: parseInt(items[item].offsetHeight),
              //   width: parseInt(items[item].offsetWidth),
              // };
              // if (checkCollision(playerPos, objPos)) {
              //   console.log("item collected");
              //   room.send("collect_item", item);
              //   document.body.removeChild(items[item]);
              //   delete items[item];
              // }
            });
          }
        });
      });
    });
  }, []);

  function checkCollision(obj1: Object, obj2: Object) {
    if (
      obj1.top + obj1.height >= obj2.top &&
      obj1.left + obj1.width >= obj2.left
    ) {
      return true;
    }
  }

  function getCenter(obj: Object) {
    const x = obj.left + obj.width / 2;
    const y = obj.top + obj.height / 2;

    return { x, y };
  }

  const drawCenterLines = (players: Players, items: Items, distLines: any) => {
    Object.keys(players).forEach((player: string) => {
      if (Object.keys(items).length > 0) {
        Object.keys(items).forEach((item) => {
          const playerPos = {
            top: parseInt(players[player].style.top),
            left: parseInt(players[player].style.left),
            height: parseInt(players[player].offsetHeight),
            width: parseInt(players[player].offsetWidth),
          };

          const objPos = {
            top: parseInt(items[item].style.top),
            left: parseInt(items[item].style.left),
            height: parseInt(items[item].offsetHeight),
            width: parseInt(items[item].offsetWidth),
          };

          const playerCenter = getCenter(playerPos);
          const objCenter = getCenter(objPos);

          distLines[item].setAttribute("x1", objCenter.x);
          distLines[item].setAttribute("x2", playerCenter.x);
          distLines[item].setAttribute("y1", objCenter.y);
          distLines[item].setAttribute("y2", playerCenter.y);
        });
      }
    });
  };

  function up() {
    room.send("move", { y: -1 });
  }

  function right() {
    room.send("move", { x: 1 });
  }

  function down() {
    room.send("move", { y: 1 });
  }

  function left() {
    room.send("move", { x: -1 });
  }

  return (
    <div id="screen">
      <svg id="overlay" width="100%" height="100%" />
    </div>
  );
};

const GameObject = styled.div`
  width: ${(props: any) => props.width ?? "20px"};
  height: ${(props: any) => props.width ?? "20px"};
  background: ${(props: any) => props.background ?? "black"};
  position: absolute;
  box-sizing: border-box;
`;
