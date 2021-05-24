import { GetStaticPaths, GetStaticProps } from 'next';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import Head from 'next/head';
import Prismic from '@prismicio/client';
import { useRouter } from 'next/router';
import { RichText } from 'prismic-dom';
import Link from 'next/link';

import format from 'date-fns/format';
import ptBR from 'date-fns/locale/pt-BR';
import { getPrismicClient } from '../../services/prismic';
import Utterances from '../../components/Utterances';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  uid: string;
  data: {
    title: string;
    subtitle: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        type: string;
        text: string;
      }[];
    }[];
  };
}

interface PrevNextPost {
  previous: {
    slug: string;
    title: string;
  };
  next: {
    slug: string;
    title: string;
  };
}

interface PostProps {
  post: Post;
  preview: boolean;
  nextPrev: PrevNextPost;
}

export default function Post({
  post,
  preview,
  nextPrev,
}: PostProps): React.ReactElement {
  const router = useRouter();
  const { next, previous } = nextPrev;

  if (router.isFallback) {
    return <div>Carregando...</div>;
  }

  const { content } = post.data;

  const htmlContent = content.reduce((html, itemContent) => {
    const bodyContent = RichText.asHtml(itemContent.body);
    const headingContent = `<h1>${itemContent.heading}</h1>`;

    return `${html}${headingContent}${bodyContent}`;
  }, '');

  const textContent = content.reduce(
    (text, itemContent) =>
      text + itemContent.heading + RichText.asText(itemContent.body),
    ''
  );

  const timeToRead = (textContent.split(' ').length * 0.4) / 60;

  return (
    <>
      <Head>
        <title>{post.data.title} </title>
      </Head>
      {post.data.banner && (
        <img
          className={styles.banner}
          src={post.data.banner.url}
          alt="banner"
        />
      )}
      <main className={styles.container}>
        <h1>{post.data.title}</h1>
        <div className={styles.icons}>
          <time className={commonStyles.iconText}>
            <FiCalendar />
            {format(new Date(post.first_publication_date), 'dd MMM yyyy', {
              locale: ptBR,
            })}
          </time>
          <span className={commonStyles.iconText}>
            <FiUser />
            {post.data.author}
          </span>
          <span className={commonStyles.iconText}>
            <FiClock />
            {timeToRead.toFixed()} min
          </span>
        </div>
        {post.last_publication_date && (
          <div className={styles.edited}>
            * editado em
            <time>
              {format(
                new Date(post.last_publication_date),
                // eslint-disable-next-line prettier/prettier
                " dd MMM yyyy, à's' HH:mm:ss",
                {
                  locale: ptBR,
                }
              )}
            </time>
          </div>
        )}
        <div className={styles.content}>
          <div
            className={styles.post}
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
        {(next.slug || previous.slug) && (
          <>
            <div className={styles.section} />
            <div className={styles.otherPostsContent}>
              {previous.slug && (
                <div className={styles.leftPostLink}>
                  {previous.title}
                  <Link href={`/post/${previous.slug}`}>
                    <a>Post Anterior</a>
                  </Link>
                </div>
              )}
              {next.slug && (
                <div className={styles.rightPostLink}>
                  {next.title}
                  <Link href={`/post/${next.slug}`}>
                    <a>Próximo Post</a>
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
        <Utterances />
        {preview && (
          <aside className={commonStyles.preview}>
            <Link href="/api/exit-preview">
              <a>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();

  const resp = prismic.query([Prismic.predicates.at('document.type', 'post')], {
    pageSize: 20,
  });

  const slugs = resp.then(post =>
    post.results.map(_post => ({ params: { slug: _post.uid } }))
  );

  return {
    paths: [...(await slugs.then(slug => slug))],
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps<PostProps> = async context => {
  const prismic = getPrismicClient();
  const { slug } = context.params;
  const { preview, previewData } = context;

  const response = await prismic.getByUID('post', String(slug), {
    ref: previewData?.ref ?? null,
  });

  console.log(response);

  const previous = await prismic.query(
    [Prismic.Predicates.at('document.type', 'post')],
    {
      fetch: ['post.title'],
      pageSize: 1,
      ref: previewData?.ref ?? null,
      after: response?.id,
      orderings: '[document.first_publication_date]',
    }
  );

  const after = await prismic.query(
    [Prismic.Predicates.at('document.type', 'post')],
    {
      fetch: ['post.title'],
      pageSize: 1,
      ref: previewData?.ref ?? null,
      after: response?.id,
      orderings: '[document.first_publication_date desc]',
    }
  );

  const post = {
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    uid: response.uid,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content.map(content => ({
        heading: content.heading,
        body: content.body,
      })),
    },
  };

  return {
    props: {
      post,
      preview: preview ?? false,
      nextPrev: {
        previous: {
          slug: previous.results[0]?.uid ?? null,
          title: previous.results[0]?.data.title ?? null,
        },
        next: {
          slug: after.results[0]?.uid ?? null,
          title: after.results[0]?.data.title ?? null,
        },
      },
    },
    revalidate: 60 * 30, // 30 minutes
  };
};
