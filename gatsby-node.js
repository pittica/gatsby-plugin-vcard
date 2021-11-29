const fs = require("fs")
const path = require("path")

exports.pluginOptionsSchema = ({ Joi }) => {
  return Joi.object({
    query: Joi.string()
      .description("The query for the data need to generate the vCards.")
      .required(),
    resolve: Joi.function()
      .description("The main function to parse the data.")
      .required(),
    getNodes: Joi.function()
      .description("The main function to get data.")
      .required(),
    organization: Joi.string().description("The organization."),
    logo: Joi.string().description(
      "The logo as path relative to the Gatsby directory."
    ),
    url: Joi.string().description("The organization's URL."),
  })
}

const getImage = (target) => {
  if (target) {
    const targetString = fs.readFileSync(target, {
      encoding: "base64",
    })

    if (targetString) {
      let type = path.extname(target).toUpperCase()

      if (type === "JPG") {
        type = "JPEG"
      }

      return `TYPE=${type}:${targetString}`
    }
  }

  return null
}

const getFilename = (firstName, lastName) => {
  const s = `${firstName} ${lastName}`

  return s.toLowerCase().replaceAll(" ", "-")
}

exports.onPostBuild = async (
  { graphql },
  { query, resolve, getNodes, organization, logo, url }
) => {
  const { data } = await graphql(query)
  const nodes = getNodes(data)
  const logoString = getImage(logo)

  nodes.forEach((n) => {
    const node = resolve(n)
    const photoString = getImage(node.photo)
    const vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN;CHARSET=UTF-8:${node.firstName} ${node.lastName}`,
      `N;CHARSET=UTF-8:${node.lastName};${node.firstName};;;`,
    ]

    if (node.email) {
      vcard.push(`EMAIL;CHARSET=UTF-8;type=WORK,INTERNET:${node.email}`)
    }

    if (logoString) {
      vcard.push(`LOGO;ENCODING=b;${logoString}`)
    }

    if (photoString) {
      vcard.push(`PHOTO;ENCODING=b;${photoString}`)
    }

    if (node.phone) {
      vcard.push(`TEL;TYPE=CELL:${node.phone}`)
    }

    if (node.role) {
      vcard.push(`ROLE;CHARSET=UTF-8:${node.role}`)
    }

    if (organization) {
      vcard.push(`ORG;CHARSET=UTF-8:${organization}`)
    }

    vcard.push(`URL;type=WORK;CHARSET=UTF-8:${url}`)

    if (node.linkedIn) {
      vcard.push(`X-SOCIALPROFILE;TYPE=linkedin:${node.linkedIn}`)
    }

    vcard.push(`REV:${new Date().toISOString()}`)
    vcard.push(`END:VCARD`)

    fs.mkdirSync(path.join(`public`, `vcards`), { recursive: true })
    fs.writeFileSync(
      path.join(
        `public`,
        `vcards`,
        `${getFilename(node.firstName, node.lastName)}.vcf`
      ),
      vcard.join("\r\n")
    )
  })
}
