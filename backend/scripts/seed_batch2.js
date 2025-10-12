// scripts/seed_batch2.js  (ESM)
import 'dotenv/config.js';
import mongoose from 'mongoose';
import User from '../models/userModel.js';
import Question from '../models/questionModel.js';

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('DB connected');

  // 1) Find-or-create seeder user: Udiotic
  const uname = 'Udiotic';
  const seeder =
    (await User.findOne({ usernameLower: uname.toLowerCase() }).select('_id username')) ||
    (await User.create({
      email: `udiotic+seed@deductive.local`,
      username: uname,
      usernameLower: uname.toLowerCase(),
      passwordHash: 'seeded-no-login', // dummy, not used
      verified: true,
    }));

  console.log('Seeder user:', seeder.username, seeder._id.toString());


  const DATA = [
  {
    body:
      "The literal meaning of the word X is, the quality of being very confident in one's behaviour or the quality of being very noticeable in style. While it can be used positively to describe someone with a bold and exciting personality, it is generally used negatively to imply someone is over-the-top or trying to be noticed in an excessive way. Interestingly, a group of Flamingos is also called X. What word are we talking about?",
    images: [],
    answer: "Flamboyance",
    answerImage: {
      url: "https://cdn.theatlantic.com/thumbor/wb8oynfAdobqt9Rg3hntzSdtSEM=/900x600/media/img/photo/2020/05/photos-a-flamboyance-of-flamingos/a05_5217595/original.jpg"
    },
    answerOneLiner: "",
    tags: []
  },
  {
    body:
      "While several methods to test the validity of a program had been in usage, the tradition of using X for the same was influenced by a book written in 1978 by Brian Kernighan. Brian once mentioned that the phrase \"X\" was inspired by a cartoon he had seen, where a baby chick hatches from an egg and says those exact words. What phrase?",
    images: [],
    answer: "Hello, World!",
    answerImage: {
      url: "https://upload.wikimedia.org/wikipedia/commons/2/21/Hello_World_Brian_Kernighan_1978.jpg"
    },
    answerOneLiner:
      "\"Hello, World!\" program handwritten in the C language and signed by Brian Kernighan",
    tags: []
  },
  {
    body:
      "In the early 20th century, two German brothers ran a shoe company together from their mother’s laundry room. Eventually, tensions rose, and the family business split in dramatic fashion. One brother, Adolf, went on to create a brand, what is now known as Adidas. The other brother chose a different path, setting up his own company on the opposite side of the river. A rivalry thus began, both familial and corporate, and it divided their town for decades — even influencing which factory your football club supported. Which brand did the other brother go on to found?",
    images: [],
    answer: "PUMA",
    answerImage: {
      url: "https://upload.wikimedia.org/wikipedia/en/d/da/Puma_complete_logo.svg"
    },
    answerOneLiner: "",
    tags: []
  },
  {
    body:
      "In the mid-2000s, a father in North Carolina decided to test out his new digital camera by photographing a local training exercise, where firefighters were intentionally burning down a house for practice. What he captured though, was a surreal juxtaposition. Years later, the photo was unearthed by the internet and given a second life. Suddenly, it was everywhere: plastered onto scenes of global catastrophes, pop culture collapses, and personal misfortunes. What image is being described?",
    images: [],
    answer: "Disaster Girl",
    answerImage: {
      url: "https://upload.wikimedia.org/wikipedia/en/1/11/Disaster_Girl.jpg"
    },
    answerOneLiner: "",
    tags: []
  },
  {
    body:
      "“X” is a phenomenon that dates back to ancient courts, where devoted companions would write poetry, lend a listening ear, and stay ever-present by the queen’s side, often mistaking proximity for a promise. But when it came time for romance, the queen would choose a more \"suitable\" match, and the companion would remain as a friend to the queen. However, the term 'X' owes its popularity to 'Y', when he famously described his friend as the \"mayor of the X\". What term and who? Or simply, identify X & Y.",
    images: [],
    answer: "X: Friend-Zone, Y: Joey Tribbiani",
    answerImage: {
      url: "https://i.redd.it/eifmw8ujh3d81.jpg"
    },
    answerOneLiner: "",
    tags: []
  }
];


  // 3) Attach submitter + status and insert
  const docs = DATA.map(d => ({
    ...d,
    submittedBy: seeder._id,
    status: 'approved', // ya 'pending' if you want to review
  }));

  const res = await Question.insertMany(docs, { ordered: false });
  console.log(`Inserted: ${res.length} questions`);
}

main()
  .then(() => mongoose.disconnect())
  .catch(e => { console.error(e); mongoose.disconnect(); });
