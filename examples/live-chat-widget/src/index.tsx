import { render } from "preact";
import "./style.css";
import { ChatWidget } from "./ChatWidget/ChatWidget";
import "./mockMessages";

export function App() {
  return (
    <>
      <h1>Using BufferedEventEmitter in a Chat Widget</h1>
      <ChatWidget />
      <section>
        <Resource
          title="Live Chat simulation"
          description="Event data cached. Buffered message delivery (capacity: 4, timeout: 2s). Loading last 20 cached messages when widget opens. "
        />
      </section>
    </>
  );
}

function Resource(props) {
  return (
    <div class="resource">
      <h2>{props.title}</h2>
      <p>{props.description}</p>
    </div>
  );
}

render(<App />, document.getElementById("app"));
