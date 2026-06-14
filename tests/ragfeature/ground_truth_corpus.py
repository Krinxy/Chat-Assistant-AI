"""Ground-truth corpus for retrieval validation (AP 1A).

Twenty topically distinct documents, each paired with a natural-language query whose
best answer lives in exactly that document. Used to measure top-1 hit-rate and the
cosine-similarity of the best match for the real embedding pipeline.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class GroundTruthDocument:
    doc_id: str
    text: str
    query: str


GROUND_TRUTH_CORPUS: tuple[GroundTruthDocument, ...] = (
    GroundTruthDocument(
        "photosynthesis",
        "Photosynthesis is the process by which green plants convert sunlight, water and carbon dioxide into "
        "glucose and oxygen. It takes place in the chloroplasts, where the pigment chlorophyll absorbs light energy.",
        "How do plants turn sunlight into food?",
    ),
    GroundTruthDocument(
        "http-status-codes",
        "HTTP status codes signal the result of a web request. The 200 range means success, 300 means redirection, "
        "400 indicates a client error such as 404 Not Found, and 500 marks a server-side error.",
        "What does a 404 response mean in a web request?",
    ),
    GroundTruthDocument(
        "roman-empire",
        "The Roman Empire was founded when Augustus became the first emperor in 27 BC. At its height it surrounded the "
        "Mediterranean Sea and was governed through provinces connected by an extensive network of paved roads.",
        "When did Augustus become the first Roman emperor?",
    ),
    GroundTruthDocument(
        "black-holes",
        "A black hole is a region of spacetime where gravity is so strong that nothing, not even light, can escape. "
        "Its boundary is called the event horizon, and many form from the collapse of massive stars.",
        "What is the event horizon of a black hole?",
    ),
    GroundTruthDocument(
        "sourdough-bread",
        "Sourdough bread rises using a starter of wild yeast and lactic acid bacteria instead of commercial yeast. "
        "The fermentation gives the loaf its tangy flavour and chewy, open crumb.",
        "Why does sourdough bread taste tangy?",
    ),
    GroundTruthDocument(
        "tcp-handshake",
        "TCP establishes a connection with a three-way handshake. The client sends a SYN packet, the server replies "
        "with SYN-ACK, and the client answers with an ACK before any data is exchanged.",
        "How does the TCP three-way handshake work?",
    ),
    GroundTruthDocument(
        "mitochondria",
        "Mitochondria are the powerhouses of the cell, producing energy in the form of ATP through cellular "
        "respiration. They have their own DNA and are thought to descend from ancient symbiotic bacteria.",
        "Which organelle produces ATP in a cell?",
    ),
    GroundTruthDocument(
        "french-revolution",
        "The French Revolution began in 1789 with the storming of the Bastille. It abolished the absolute monarchy and "
        "spread ideals of liberty, equality and fraternity across Europe.",
        "What event started the French Revolution in 1789?",
    ),
    GroundTruthDocument(
        "gradient-descent",
        "Gradient descent is an optimization algorithm that minimizes a loss function by iteratively stepping in the "
        "direction of the steepest negative gradient. The learning rate controls the size of each step.",
        "What does the learning rate control in gradient descent?",
    ),
    GroundTruthDocument(
        "volcano-formation",
        "Volcanoes form where magma from the mantle reaches the surface, often at tectonic plate boundaries or hotspots. "
        "When pressure builds, lava, ash and gases erupt through a vent.",
        "Where do volcanoes usually form on Earth?",
    ),
    GroundTruthDocument(
        "coffee-brewing",
        "Pour-over coffee brewing drips hot water through ground beans in a paper filter. The water temperature and "
        "grind size strongly affect extraction and the final taste in the cup.",
        "How does grind size affect pour-over coffee?",
    ),
    GroundTruthDocument(
        "gdpr",
        "The General Data Protection Regulation is an EU law that governs how organizations collect and process personal "
        "data. It grants individuals rights such as access, rectification and erasure of their information.",
        "What rights does the GDPR give individuals over their data?",
    ),
    GroundTruthDocument(
        "python-gil",
        "The Global Interpreter Lock in CPython allows only one thread to execute Python bytecode at a time. This "
        "simplifies memory management but limits the speedup of CPU-bound multithreading.",
        "Why does the Python GIL limit CPU-bound threads?",
    ),
    GroundTruthDocument(
        "vaccines-immunity",
        "Vaccines train the immune system by exposing it to a harmless piece of a pathogen. The body then produces "
        "antibodies and memory cells that respond quickly to a future real infection.",
        "How do vaccines help the immune system fight infection?",
    ),
    GroundTruthDocument(
        "mount-everest",
        "Mount Everest, on the border between Nepal and Tibet, is the highest mountain above sea level at 8,849 metres. "
        "Climbers must cross the dangerous Khumbu Icefall on the standard south route.",
        "How tall is Mount Everest above sea level?",
    ),
    GroundTruthDocument(
        "blockchain",
        "A blockchain is a distributed ledger that records transactions in linked blocks secured by cryptographic "
        "hashes. Once confirmed, a block is extremely difficult to alter without redoing all later blocks.",
        "What makes a blockchain ledger hard to tamper with?",
    ),
    GroundTruthDocument(
        "jazz-history",
        "Jazz emerged in New Orleans in the early twentieth century, blending blues, ragtime and brass band music. "
        "Improvisation and swing rhythm became defining features of the genre.",
        "Where did jazz music originate?",
    ),
    GroundTruthDocument(
        "ocean-tides",
        "Ocean tides are caused mainly by the gravitational pull of the Moon on Earth's oceans. The Sun also contributes, "
        "and the alignment of Sun and Moon produces especially high spring tides.",
        "What causes ocean tides to rise and fall?",
    ),
    GroundTruthDocument(
        "ev-batteries",
        "Electric cars store energy in lithium-ion battery packs made of many cells. Charging speed depends on the "
        "charger power and the battery's thermal management during fast charging.",
        "What kind of batteries do electric cars use?",
    ),
    GroundTruthDocument(
        "honeybee-colonies",
        "A honeybee colony is organized around a single queen, thousands of female worker bees and seasonal male drones. "
        "Workers forage for nectar and communicate food locations through a waggle dance.",
        "How do honeybees communicate where food is?",
    ),
)
